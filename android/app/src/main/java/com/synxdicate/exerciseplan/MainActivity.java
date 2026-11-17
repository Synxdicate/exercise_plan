package com.synxdicate.exerciseplan;

import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(RunNoticePlugin.class);
        registerPlugin(HeartRatePlugin.class);
        super.onCreate(savedInstanceState);
    }
}
