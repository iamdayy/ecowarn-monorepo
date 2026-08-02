import { NativeTabs, Icon, Label } from 'expo-router/unstable-native-tabs';
import React from 'react';

import { renderAndroidIcon } from '@/components/ui/native-tab-icon';
import { EcoWarnColors } from '@/constants/theme';

export default function RelawanLayout() {
  return (
    <NativeTabs tintColor={EcoWarnColors.primaryLight}>
      <NativeTabs.Trigger name="index">
        <Label>Peta Spasial</Label>
        <Icon sf="map.fill" androidSrc={renderAndroidIcon('map')} />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="scanner">
        <Label>Pemindai AI</Label>
        <Icon sf="camera.fill" androidSrc={renderAndroidIcon('photo-camera')} />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="history">
        <Label>Riwayat Laporan</Label>
        <Icon sf="doc.text.fill" androidSrc={renderAndroidIcon('history')} />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="profile">
        <Label>Profil Relawan</Label>
        <Icon sf="shield.fill" androidSrc={renderAndroidIcon('security')} />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
