package com.synxdicate.exerciseplan;

import android.Manifest;
import android.annotation.SuppressLint;
import android.bluetooth.BluetoothAdapter;
import android.bluetooth.BluetoothDevice;
import android.bluetooth.BluetoothGatt;
import android.bluetooth.BluetoothGattCallback;
import android.bluetooth.BluetoothGattCharacteristic;
import android.bluetooth.BluetoothGattDescriptor;
import android.bluetooth.BluetoothGattService;
import android.bluetooth.BluetoothManager;
import android.bluetooth.BluetoothProfile;
import android.bluetooth.le.BluetoothLeScanner;
import android.bluetooth.le.ScanCallback;
import android.bluetooth.le.ScanFilter;
import android.bluetooth.le.ScanResult;
import android.bluetooth.le.ScanSettings;
import android.content.Context;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;
import android.os.ParcelUuid;

import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

import java.util.Collections;
import java.util.UUID;

/**
 * สายวัดชีพจรบลูทูธ (มาตรฐาน Heart Rate Service 0x180D, ค่า 0x2A37) — WebView ของ Android ไม่มี Web Bluetooth
 * connect(): หาอุปกรณ์ที่ประกาศบริการชีพจร 15 วินาที แล้วต่อเครื่องแรกที่เจอ ส่งค่าเป็น event "hr" {bpm}
 * สถานะเป็น event "state": connected / lost (สายหลุด กำลังต่อใหม่เอง) / off
 * Android 12+ ใช้สิทธิ์ BLUETOOTH_SCAN (neverForLocation) + BLUETOOTH_CONNECT; รุ่นเก่าใช้สิทธิ์ตำแหน่งที่ขอไว้แล้วสำหรับ GPS
 */
@CapacitorPlugin(
    name = "HeartRate",
    permissions = {
        @Permission(alias = "bluetooth", strings = { Manifest.permission.BLUETOOTH_SCAN, Manifest.permission.BLUETOOTH_CONNECT }),
        @Permission(alias = "location", strings = { Manifest.permission.ACCESS_FINE_LOCATION }),
    }
)
public class HeartRatePlugin extends Plugin {
    static final UUID HR_SERVICE = UUID.fromString("0000180d-0000-1000-8000-00805f9b34fb");
    static final UUID HR_MEASUREMENT = UUID.fromString("00002a37-0000-1000-8000-00805f9b34fb");
    static final UUID CCCD = UUID.fromString("00002902-0000-1000-8000-00805f9b34fb");
    static final long SCAN_MS = 15000;

    private final Handler handler = new Handler(Looper.getMainLooper());
    private BluetoothGatt gatt;
    private BluetoothLeScanner scanner;
    private ScanCallback scanCallback;
    private PluginCall pending;
    private boolean wanted = false;

    private String alias() {
        return Build.VERSION.SDK_INT >= Build.VERSION_CODES.S ? "bluetooth" : "location";
    }

    @PluginMethod
    public void connect(PluginCall call) {
        if (getPermissionState(alias()) != PermissionState.GRANTED) {
            requestPermissionForAlias(alias(), call, "permsDone");
            return;
        }
        start(call);
    }

    @PermissionCallback
    private void permsDone(PluginCall call) {
        if (getPermissionState(alias()) != PermissionState.GRANTED) {
            call.reject("permission");
            return;
        }
        start(call);
    }

    @SuppressLint("MissingPermission")
    private void start(PluginCall call) {
        BluetoothManager bm = (BluetoothManager) getContext().getSystemService(Context.BLUETOOTH_SERVICE);
        BluetoothAdapter adapter = bm == null ? null : bm.getAdapter();
        if (adapter == null) {
            call.reject("unsupported");
            return;
        }
        if (!adapter.isEnabled()) {
            call.reject("bluetooth-off");
            return;
        }
        stopScan();
        closeGatt();
        wanted = true;
        pending = call;
        scanner = adapter.getBluetoothLeScanner();
        if (scanner == null) {
            pending = null;
            call.reject("bluetooth-off");
            return;
        }
        scanCallback = new ScanCallback() {
            @Override
            public void onScanResult(int callbackType, ScanResult result) {
                if (scanCallback == null) return; // ผลที่ค้างมาหลังหยุดค้นหาแล้ว
                BluetoothDevice device = result.getDevice();
                stopScan();
                handler.removeCallbacksAndMessages(null);
                connectDevice(device);
            }

            @Override
            public void onScanFailed(int errorCode) {
                stopScan();
                fail("scan-failed");
            }
        };
        ScanFilter filter = new ScanFilter.Builder().setServiceUuid(new ParcelUuid(HR_SERVICE)).build();
        ScanSettings settings = new ScanSettings.Builder().setScanMode(ScanSettings.SCAN_MODE_LOW_LATENCY).build();
        scanner.startScan(Collections.singletonList(filter), settings, scanCallback);
        handler.postDelayed(() -> {
            stopScan();
            fail("not-found");
        }, SCAN_MS);
    }

    @SuppressLint("MissingPermission")
    private void connectDevice(BluetoothDevice device) {
        BluetoothGattCallback cb = new BluetoothGattCallback() {
            @Override
            public void onConnectionStateChange(BluetoothGatt g, int status, int newState) {
                if (newState == BluetoothProfile.STATE_CONNECTED) {
                    g.discoverServices();
                } else if (newState == BluetoothProfile.STATE_DISCONNECTED) {
                    if (pending != null) {
                        fail("connect-failed");
                        return;
                    }
                    if (wanted) {
                        // หลุดระหว่างวิ่ง (ออกนอกระยะ/ถอดสาย): บอก JS แล้วต่อใหม่เองเมื่อกลับมาในระยะ
                        state("lost");
                        g.close();
                        gatt = device.connectGatt(getContext(), true, this, BluetoothDevice.TRANSPORT_LE);
                    }
                }
            }

            @Override
            public void onServicesDiscovered(BluetoothGatt g, int status) {
                BluetoothGattService s = g.getService(HR_SERVICE);
                BluetoothGattCharacteristic c = s == null ? null : s.getCharacteristic(HR_MEASUREMENT);
                if (c == null) {
                    fail("no-hr-service");
                    return;
                }
                g.setCharacteristicNotification(c, true);
                BluetoothGattDescriptor d = c.getDescriptor(CCCD);
                if (d != null) {
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                        g.writeDescriptor(d, BluetoothGattDescriptor.ENABLE_NOTIFICATION_VALUE);
                    } else {
                        d.setValue(BluetoothGattDescriptor.ENABLE_NOTIFICATION_VALUE);
                        g.writeDescriptor(d);
                    }
                }
                state("connected");
                if (pending != null) {
                    JSObject r = new JSObject();
                    String name = device.getName();
                    r.put("name", name == null ? "" : name);
                    pending.resolve(r);
                    pending = null;
                }
            }

            // Android 13+
            @Override
            public void onCharacteristicChanged(BluetoothGatt g, BluetoothGattCharacteristic c, byte[] value) {
                emit(value);
            }

            // Android 12 และเก่ากว่า
            @Override
            @SuppressWarnings("deprecation")
            public void onCharacteristicChanged(BluetoothGatt g, BluetoothGattCharacteristic c) {
                if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) emit(c.getValue());
            }
        };
        gatt = device.connectGatt(getContext(), false, cb, BluetoothDevice.TRANSPORT_LE);
    }

    /** เหมือน parseHeartRate ใน hrLog.ts: bit 0 ของ flags = uint16 */
    private void emit(byte[] v) {
        if (v == null || v.length < 2) return;
        int bpm;
        if ((v[0] & 1) != 0) {
            if (v.length < 3) return;
            bpm = (v[1] & 0xff) | ((v[2] & 0xff) << 8);
        } else {
            bpm = v[1] & 0xff;
        }
        if (bpm < 25 || bpm > 250) return;
        JSObject o = new JSObject();
        o.put("bpm", bpm);
        notifyListeners("hr", o);
    }

    private void state(String s) {
        JSObject o = new JSObject();
        o.put("state", s);
        notifyListeners("state", o);
    }

    private void fail(String reason) {
        wanted = false;
        closeGatt();
        if (pending != null) {
            pending.reject(reason);
            pending = null;
        }
        state("off");
    }

    @SuppressLint("MissingPermission")
    private void stopScan() {
        if (scanner != null && scanCallback != null) {
            try {
                scanner.stopScan(scanCallback);
            } catch (Exception ignored) {
                // บลูทูธถูกปิดระหว่างค้นหา
            }
        }
        scanCallback = null;
    }

    @SuppressLint("MissingPermission")
    private void closeGatt() {
        if (gatt != null) {
            try {
                gatt.disconnect();
                gatt.close();
            } catch (Exception ignored) {
                // ปิดไปแล้ว
            }
        }
        gatt = null;
    }

    @PluginMethod
    public void disconnect(PluginCall call) {
        wanted = false;
        handler.removeCallbacksAndMessages(null);
        stopScan();
        closeGatt();
        if (pending != null) {
            pending.reject("cancelled");
            pending = null;
        }
        call.resolve();
    }

    @Override
    protected void handleOnDestroy() {
        wanted = false;
        stopScan();
        closeGatt();
    }
}
