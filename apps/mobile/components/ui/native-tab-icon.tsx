import React, { ComponentProps } from 'react';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { VectorIcon } from 'expo-router/unstable-native-tabs';

type MaterialIconName = ComponentProps<typeof MaterialIcons>['name'];

/**
 * Helper fungsional yang menghasilkan elemen <VectorIcon> dari expo-router secara spesifik untuk MaterialIcons.
 * Ditujukan untuk digunakan pada properti `androidSrc` di dalam komponen <Icon> NativeTabs,
 * menjaga integritas pengetesan tipe (type-checking) serta efisiensi render natif di OS Android.
 */
export function renderAndroidIcon(name: MaterialIconName) {
  return <VectorIcon family={MaterialIcons} name={name} />;
}
