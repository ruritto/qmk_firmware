/*
 * moff BLE サーバー (NimBLE) — Garmin "moff link" アプリの受け側サンプル
 *
 * Connect IQ の BLE はセントラル専用のため、moff (ESP32) 側が
 * ペリフェラル (GATT サーバー) としてアドバタイズし、
 * 時計側アプリが接続して心拍値 (1 バイト, bpm) を書き込んでくる。
 *
 * UUID は moff-garmin-app/source/MoffBleDelegate.mc と一致させること。
 *
 * 必要ライブラリ: NimBLE-Arduino (Arduino IDE のライブラリマネージャから)
 *
 * moff 本体 (src/ble_handler.h) に組み込む場合は、このファイルの
 * setupBLE() / getHeartRate() をそのまま移植すればよい。
 */

#include <NimBLEDevice.h>

static const char* MOFF_SERVICE_UUID = "0DF0A1E0-5A0B-4C2D-9E8F-C0FFEE000001";
static const char* MOFF_HR_CHAR_UUID = "0DF0A1E0-5A0B-4C2D-9E8F-C0FFEE000002";

// CLAUDE.md の要件: 心拍データは 10 秒でタイムアウト (HR_TIMEOUT_MS)
static const uint32_t HR_TIMEOUT_MS = 10000;

static volatile int      g_heartRate    = 0;
static volatile uint32_t g_lastHrMillis = 0;

class HrCharCallbacks : public NimBLECharacteristicCallbacks {
    void onWrite(NimBLECharacteristic* c) override {
        NimBLEAttValue v = c->getValue();
        if (v.size() >= 1) {
            g_heartRate    = v.data()[0];
            g_lastHrMillis = millis();
        }
    }
};

class ServerCallbacks : public NimBLEServerCallbacks {
    void onConnect(NimBLEServer* server) override {
        Serial.println("[BLE] watch connected");
    }
    void onDisconnect(NimBLEServer* server) override {
        Serial.println("[BLE] watch disconnected, restart advertising");
        NimBLEDevice::startAdvertising();
    }
};

void setupBLE() {
    NimBLEDevice::init("moff");

    NimBLEServer* server = NimBLEDevice::createServer();
    server->setCallbacks(new ServerCallbacks());

    NimBLEService* service = server->createService(MOFF_SERVICE_UUID);
    NimBLECharacteristic* hrChar = service->createCharacteristic(
        MOFF_HR_CHAR_UUID,
        NIMBLE_PROPERTY::WRITE | NIMBLE_PROPERTY::WRITE_NR);
    hrChar->setCallbacks(new HrCharCallbacks());
    service->start();

    // スキャン結果からサービス UUID で moff を見つけられるよう、
    // アドバタイズパケットにサービス UUID を必ず含める
    NimBLEAdvertising* adv = NimBLEDevice::getAdvertising();
    adv->addServiceUUID(MOFF_SERVICE_UUID);
    adv->setScanResponse(true);
    adv->start();

    Serial.println("[BLE] advertising as 'moff'");
}

// 直近の心拍値 (bpm) を返す。タイムアウト時は 0 (= データなし)
int getHeartRate() {
    if (millis() - g_lastHrMillis > HR_TIMEOUT_MS) {
        return 0;
    }
    return g_heartRate;
}

void setup() {
    Serial.begin(115200);
    setupBLE();
}

void loop() {
    static uint32_t lastPrint = 0;
    if (millis() - lastPrint >= 1000) {
        lastPrint = millis();
        int hr = getHeartRate();
        if (hr > 0) {
            Serial.printf("HR: %d bpm\n", hr);
        } else {
            Serial.println("HR: (no data)");
        }
    }
}
