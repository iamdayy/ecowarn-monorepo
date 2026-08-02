import { NativeTabs, Icon, Label } from 'expo-router/unstable-native-tabs';
import React from 'react';

import { renderAndroidIcon } from '@/components/ui/native-tab-icon';
import { EcoWarnColors } from '@/constants/theme';

export default function WargaLayout() {
  return (
    <NativeTabs tintColor={EcoWarnColors.primaryLight}>
      <NativeTabs.Trigger name="index">
        <Label>Peta Spasial</Label>
        <Icon sf="map.fill" androidSrc={renderAndroidIcon('map')} />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="alerts">
        <Label>Peringatan Dini</Label>
        <Icon sf="exclamationmark.triangle.fill" androidSrc={renderAndroidIcon('warning')} />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="profile">
        <Label>Profil Warga</Label>
        <Icon sf="person.fill" androidSrc={renderAndroidIcon('person')} />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
