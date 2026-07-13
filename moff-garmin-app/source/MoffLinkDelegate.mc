import Toybox.Lang;
import Toybox.WatchUi;

class MoffLinkDelegate extends WatchUi.BehaviorDelegate {

    private var _ble as MoffBleDelegate;

    function initialize(ble as MoffBleDelegate) {
        BehaviorDelegate.initialize();
        _ble = ble;
    }

    // SELECT (右上ボタン / タップ): スキャン開始・停止、接続中なら切断
    function onSelect() as Boolean {
        _ble.toggleScan();
        return true;
    }
}
