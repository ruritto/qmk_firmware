import Toybox.Application;
import Toybox.BluetoothLowEnergy;
import Toybox.Lang;
import Toybox.Sensor;
import Toybox.WatchUi;

// moff link — Venu SQ 2 上で計測した心拍数を、BLE 経由で moff (ESP32) に送信する
// Connect IQ の BLE はセントラル専用のため、時計側がクライアントとして
// moff (NimBLE サーバー) に接続し、心拍値を Characteristic へ書き込む。
class MoffLinkApp extends Application.AppBase {

    private var _bleDelegate as MoffBleDelegate?;
    private var _view as MoffLinkView?;

    function initialize() {
        AppBase.initialize();
    }

    function onStart(state as Dictionary?) as Void {
        // 手首の光学心拍センサーを有効化し、約1秒周期でイベントを受け取る
        Sensor.setEnabledSensors([Sensor.SENSOR_HEARTRATE] as Array<Sensor.SensorType>);
        Sensor.enableSensorEvents(method(:onSensorEvent));
    }

    function onStop(state as Dictionary?) as Void {
        Sensor.enableSensorEvents(null);
        if (_bleDelegate != null) {
            _bleDelegate.shutdown();
        }
    }

    function onSensorEvent(info as Sensor.Info) as Void {
        if (_bleDelegate != null) {
            _bleDelegate.setHeartRate(info.heartRate);
        }
        WatchUi.requestUpdate();
    }

    function getInitialView() as [Views] or [Views, InputDelegates] {
        _bleDelegate = new MoffBleDelegate();
        BluetoothLowEnergy.setDelegate(_bleDelegate);
        _bleDelegate.start();

        _view = new MoffLinkView(_bleDelegate);
        return [_view, new MoffLinkDelegate(_bleDelegate)];
    }
}
