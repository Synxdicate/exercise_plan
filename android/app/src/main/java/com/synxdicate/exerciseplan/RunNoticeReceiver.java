package com.synxdicate.exerciseplan;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

/** ปุ่มในแจ้งเตือนสด (หยุดชั่วคราว / วิ่งต่อ / ข้ามช่วง) ส่งต่อให้หน้าวิ่งใน JS */
public class RunNoticeReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context context, Intent intent) {
        String id = intent.getStringExtra("id");
        if (id != null && RunNoticePlugin.instance != null) RunNoticePlugin.instance.onAction(id);
    }
}
