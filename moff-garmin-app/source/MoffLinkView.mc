import Toybox.Graphics;
import Toybox.Lang;
import Toybox.WatchUi;

class MoffLinkView extends WatchUi.View {

    private var _ble as MoffBleDelegate;

    function initialize(ble as MoffBleDelegate) {
        View.initialize();
        _ble = ble;
    }

    function onUpdate(dc as Dc) as Void {
        dc.setColor(Graphics.COLOR_BLACK, Graphics.COLOR_BLACK);
        dc.clear();

        var cx = dc.getWidth() / 2;
        var h = dc.getHeight();

        // タイトル
        dc.setColor(Graphics.COLOR_LT_GRAY, Graphics.COLOR_TRANSPARENT);
        dc.drawText(cx, h * 0.12, Graphics.FONT_TINY, "moff link", Graphics.TEXT_JUSTIFY_CENTER);

        // 心拍数 (大きく中央表示)
        var hr = _ble.getHeartRate();
        var hrText = (hr != null) ? hr.toString() : "--";
        dc.setColor(Graphics.COLOR_WHITE, Graphics.COLOR_TRANSPARENT);
        dc.drawText(cx, h * 0.30, Graphics.FONT_NUMBER_THAI_HOT, hrText, Graphics.TEXT_JUSTIFY_CENTER);
        dc.setColor(Graphics.COLOR_LT_GRAY, Graphics.COLOR_TRANSPARENT);
        dc.drawText(cx, h * 0.55, Graphics.FONT_TINY, "bpm", Graphics.TEXT_JUSTIFY_CENTER);

        // 接続状態
        var state = _ble.getLinkState();
        var statusText;
        var statusColor;
        if (state == LINK_CONNECTED) {
            var sent = _ble.getLastSentHr();
            statusText = (sent != null)
                ? WatchUi.loadResource(Rez.Strings.StatusSent) + " " + sent.toString()
                : WatchUi.loadResource(Rez.Strings.StatusConnected);
            statusColor = Graphics.COLOR_GREEN;
        } else if (state == LINK_CONNECTING) {
            statusText = WatchUi.loadResource(Rez.Strings.StatusConnecting);
            statusColor = Graphics.COLOR_YELLOW;
        } else if (state == LINK_SCANNING) {
            statusText = WatchUi.loadResource(Rez.Strings.StatusScanning);
            statusColor = Graphics.COLOR_YELLOW;
        } else {
            statusText = WatchUi.loadResource(Rez.Strings.StatusIdle);
            statusColor = Graphics.COLOR_RED;
        }
        dc.setColor(statusColor, Graphics.COLOR_TRANSPARENT);
        dc.drawText(cx, h * 0.70, Graphics.FONT_SMALL, statusText, Graphics.TEXT_JUSTIFY_CENTER);

        // 操作ヒント
        dc.setColor(Graphics.COLOR_DK_GRAY, Graphics.COLOR_TRANSPARENT);
        dc.drawText(cx, h * 0.85, Graphics.FONT_XTINY,
            WatchUi.loadResource(Rez.Strings.HintSelect), Graphics.TEXT_JUSTIFY_CENTER);
    }
}
