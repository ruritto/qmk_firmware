import Toybox.BluetoothLowEnergy;
import Toybox.Lang;
import Toybox.System;
import Toybox.Timer;
import Toybox.WatchUi;

// moff (ESP32/NimBLE サーバー) 側と一致させる UUID。
// 変更する場合は esp32/moff_ble_server_example.ino も同時に更新すること。
const MOFF_SERVICE_UUID_STR = "0DF0A1E0-5A0B-4C2D-9E8F-C0FFEE000001";
const MOFF_HR_CHAR_UUID_STR = "0DF0A1E0-5A0B-4C2D-9E8F-C0FFEE000002";

enum LinkState {
    LINK_IDLE,
    LINK_SCANNING,
    LINK_CONNECTING,
    LINK_CONNECTED
}

class MoffBleDelegate extends BluetoothLowEnergy.BleDelegate {

    private var _serviceUuid as BluetoothLowEnergy.Uuid;
    private var _charUuid as BluetoothLowEnergy.Uuid;

    private var _profileRegistered as Boolean = false;
    private var _state as LinkState = LINK_IDLE;
    private var _device as BluetoothLowEnergy.Device?;
    private var _hrChar as BluetoothLowEnergy.Characteristic?;
    private var _writePending as Boolean = false;

    private var _heartRate as Number?;
    private var _lastSentHr as Number?;
    private var _sendTimer as Timer.Timer;

    function initialize() {
        BleDelegate.initialize();
        _serviceUuid = BluetoothLowEnergy.stringToUuid(MOFF_SERVICE_UUID_STR);
        _charUuid = BluetoothLowEnergy.stringToUuid(MOFF_HR_CHAR_UUID_STR);
        _sendTimer = new Timer.Timer();
    }

    // ---- 公開 API (App / View / InputDelegate から使用) ----

    function start() as Void {
        try {
            BluetoothLowEnergy.registerProfile({
                :uuid => _serviceUuid,
                :characteristics => [{
                    :uuid => _charUuid,
                    :descriptors => []
                }]
            });
        } catch (e) {
            System.println("registerProfile failed: " + e.getErrorMessage());
        }
    }

    function shutdown() as Void {
        _sendTimer.stop();
        BluetoothLowEnergy.setScanState(BluetoothLowEnergy.SCAN_STATE_OFF);
        if (_device != null) {
            BluetoothLowEnergy.unpairDevice(_device);
            _device = null;
        }
    }

    function setHeartRate(hr as Number?) as Void {
        _heartRate = hr;
    }

    function getHeartRate() as Number? {
        return _heartRate;
    }

    function getLinkState() as LinkState {
        return _state;
    }

    function getLastSentHr() as Number? {
        return _lastSentHr;
    }

    // スキャンの開始/停止をトグル (SELECT ボタン用)
    function toggleScan() as Void {
        if (_state == LINK_CONNECTED && _device != null) {
            BluetoothLowEnergy.unpairDevice(_device);
            _device = null;
            setState(LINK_IDLE);
        } else if (_state == LINK_SCANNING) {
            BluetoothLowEnergy.setScanState(BluetoothLowEnergy.SCAN_STATE_OFF);
            setState(LINK_IDLE);
        } else if (_profileRegistered) {
            BluetoothLowEnergy.setScanState(BluetoothLowEnergy.SCAN_STATE_SCANNING);
        }
    }

    // ---- BleDelegate コールバック ----

    function onProfileRegister(uuid as BluetoothLowEnergy.Uuid, status as BluetoothLowEnergy.Status) as Void {
        if (status == BluetoothLowEnergy.STATUS_SUCCESS) {
            _profileRegistered = true;
            // 登録完了したら即スキャン開始
            BluetoothLowEnergy.setScanState(BluetoothLowEnergy.SCAN_STATE_SCANNING);
        } else {
            System.println("profile register status: " + status);
        }
    }

    function onScanStateChange(scanState as BluetoothLowEnergy.ScanState, status as BluetoothLowEnergy.Status) as Void {
        if (scanState == BluetoothLowEnergy.SCAN_STATE_SCANNING) {
            setState(LINK_SCANNING);
        } else if (_state == LINK_SCANNING) {
            setState(LINK_IDLE);
        }
    }

    function onScanResults(scanResults as BluetoothLowEnergy.Iterator) as Void {
        for (var result = scanResults.next(); result != null; result = scanResults.next()) {
            result = result as BluetoothLowEnergy.ScanResult;
            if (hasMoffService(result)) {
                BluetoothLowEnergy.setScanState(BluetoothLowEnergy.SCAN_STATE_OFF);
                setState(LINK_CONNECTING);
                BluetoothLowEnergy.pairDevice(result);
                return;
            }
        }
    }

    function onConnectedStateChanged(device as BluetoothLowEnergy.Device, state as BluetoothLowEnergy.ConnectionState) as Void {
        if (state == BluetoothLowEnergy.CONNECTION_STATE_CONNECTED) {
            _device = device;
            var service = device.getService(_serviceUuid);
            if (service != null) {
                _hrChar = service.getCharacteristic(_charUuid);
            }
            if (_hrChar != null) {
                setState(LINK_CONNECTED);
                _writePending = false;
                // 1秒周期で最新の心拍値を送信
                _sendTimer.start(method(:onSendTick), 1000, true);
            } else {
                // moff サービスが見えない相手だった — 切断して再スキャン
                BluetoothLowEnergy.unpairDevice(device);
            }
        } else {
            _sendTimer.stop();
            _device = null;
            _hrChar = null;
            _writePending = false;
            setState(LINK_IDLE);
            // 接続が切れたら自動で再スキャン
            if (_profileRegistered) {
                BluetoothLowEnergy.setScanState(BluetoothLowEnergy.SCAN_STATE_SCANNING);
            }
        }
    }

    function onCharacteristicWrite(characteristic as BluetoothLowEnergy.Characteristic, status as BluetoothLowEnergy.Status) as Void {
        _writePending = false;
    }

    // ---- 内部処理 ----

    function onSendTick() as Void {
        if (_state != LINK_CONNECTED || _hrChar == null || _writePending) {
            return;
        }
        var hr = _heartRate;
        if (hr == null) {
            return;
        }
        // ペイロードは 1 バイト (0-255 bpm)。ESP32 側の onWrite でそのまま読む。
        var payload = [hr & 0xFF]b;
        try {
            _hrChar.requestWrite(payload, {:writeType => BluetoothLowEnergy.WRITE_TYPE_WITH_RESPONSE});
            _writePending = true;
            _lastSentHr = hr;
            WatchUi.requestUpdate();
        } catch (e) {
            _writePending = false;
        }
    }

    private function hasMoffService(result as BluetoothLowEnergy.ScanResult) as Boolean {
        var uuids = result.getServiceUuids();
        for (var uuid = uuids.next(); uuid != null; uuid = uuids.next()) {
            if (_serviceUuid.equals(uuid)) {
                return true;
            }
        }
        return false;
    }

    private function setState(state as LinkState) as Void {
        _state = state;
        WatchUi.requestUpdate();
    }
}
