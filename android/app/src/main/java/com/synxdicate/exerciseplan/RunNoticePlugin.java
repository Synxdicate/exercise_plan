package com.synxdicate.exerciseplan;

import android.app.Notification;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.graphics.Color;
import android.os.Build;
import android.service.notification.StatusBarNotification;

import androidx.core.app.NotificationCompat;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * แจ้งเตือนสดระหว่างวิ่ง: เขียนทับแจ้งเตือนของบริการ GPS เบื้องหลัง (ปลั๊กอิน background-geolocation
 * id 28351 ช่องเดียวกัน) จึงมีแจ้งเตือนอันเดียว ปุ่มในแจ้งเตือนส่ง broadcast กลับมาที่ RunNoticeReceiver
 * แล้วส่งต่อให้ JS (แอปยังทำงานอยู่เพราะบริการ GPS) ไม่ต้องเปิดแอป
 */
@CapacitorPlugin(name = "RunNotice")
public class RunNoticePlugin extends Plugin {
    static final int GPS_NOTIFICATION_ID = 28351;
    static final String GPS_CHANNEL = "com.equimaps.capacitor_background_geolocation";
    static final String ACTION = "com.synxdicate.exerciseplan.RUN_NOTICE_ACTION";
    static RunNoticePlugin instance;

    @Override
    public void load() {
        instance = this;
    }

    void onAction(String id) {
        JSObject data = new JSObject();
        data.put("id", id);
        notifyListeners("action", data);
    }

    /** มีแจ้งเตือนของบริการ GPS อยู่ไหม (ไม่มี = การวิ่งจบแล้ว ห้ามสร้างใหม่ ไม่งั้นจะค้าง) */
    private boolean gpsNoticeActive(NotificationManager nm) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.M) return true;
        for (StatusBarNotification n : nm.getActiveNotifications()) if (n.getId() == GPS_NOTIFICATION_ID) return true;
        return false;
    }

    @PluginMethod
    public void update(PluginCall call) {
        Context ctx = getContext();
        NotificationManager nm = (NotificationManager) ctx.getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm == null || !gpsNoticeActive(nm)) {
            call.resolve(new JSObject().put("shown", false));
            return;
        }
        String title = call.getString("title", "Kao");
        String body = call.getString("body", "");
        String text = call.getString("text", body);
        NotificationCompat.Builder b = new NotificationCompat.Builder(ctx, GPS_CHANNEL)
                .setSmallIcon(R.drawable.ic_stat_kao)
                .setColor(Color.parseColor("#E11D48"))
                .setContentTitle(title)
                .setContentText(text)
                .setStyle(new NotificationCompat.BigTextStyle().bigText(body))
                .setOngoing(true)
                .setOnlyAlertOnce(true)
                .setSilent(true)
                .setCategory(NotificationCompat.CATEGORY_WORKOUT)
                .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
                .setPriority(NotificationCompat.PRIORITY_DEFAULT);

        // ตัวนับเวลาที่เครื่องเดินเองทุกวินาที (ไม่ต้องรอ JS อัปเดต): นับถอยหลังถึงจบช่วง หรือเวลาวิ่งรวม
        Double chronoAt = call.getDouble("chronoAt");
        if (chronoAt != null && chronoAt > 0) {
            b.setShowWhen(true).setUsesChronometer(true).setWhen(chronoAt.longValue());
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) b.setChronometerCountDown(Boolean.TRUE.equals(call.getBoolean("chronoDown", false)));
        } else {
            b.setShowWhen(false);
        }
        // แถบความคืบหน้าของช่วงนี้ (หรือระยะเป้าของวัน)
        Double progress = call.getDouble("progress");
        if (progress != null && progress >= 0) b.setProgress(1000, (int) Math.round(Math.min(1, progress) * 1000), false);

        Intent launch = ctx.getPackageManager().getLaunchIntentForPackage(ctx.getPackageName());
        if (launch != null) {
            launch.addFlags(Intent.FLAG_ACTIVITY_REORDER_TO_FRONT);
            b.setContentIntent(PendingIntent.getActivity(ctx, 0, launch, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE));
        }

        JSArray actions = call.getArray("actions", new JSArray());
        try {
            for (int i = 0; i < actions.length(); i++) {
                JSObject a = JSObject.fromJSONObject(actions.getJSONObject(i));
                Intent intent = new Intent(ctx, RunNoticeReceiver.class).setAction(ACTION).putExtra("id", a.getString("id"));
                PendingIntent pi = PendingIntent.getBroadcast(ctx, 100 + i, intent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
                String id = a.getString("id");
                int icon = "pause".equals(id) ? R.drawable.ic_notice_pause : "resume".equals(id) ? R.drawable.ic_notice_play : R.drawable.ic_notice_skip;
                b.addAction(icon, a.getString("title"), pi);
            }
        } catch (Exception e) {
            // ปุ่มผิดรูปแบบ: แสดงแจ้งเตือนโดยไม่มีปุ่ม
        }

        Notification n = b.build();
        n.flags |= Notification.FLAG_FOREGROUND_SERVICE | Notification.FLAG_NO_CLEAR;
        nm.notify(GPS_NOTIFICATION_ID, n);
        call.resolve(new JSObject().put("shown", true));
    }
}
