import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  Image,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { EcoWarnColors, Spacing, BorderRadius, Shadows } from '../../constants/theme';
import { TrashVolumeStatus, AreaType } from '../../types/ecowarn';
import { determineSeverityStatus } from '../../utils/volumeCalculator';

export interface ReportReviewModalProps {
  visible: boolean;
  imageUri: string | null;
  detectedRatio: number;
  initialSeverity: TrashVolumeStatus;
  isSubmitting: boolean;
  onConfirm: (selectedArea: AreaType) => Promise<void>;
  onRetake: () => void;
}

const AREA_OPTIONS: { type: AreaType; title: string; description: string }[] = [
  {
    type: 'Selokan',
    title: 'Selokan / Drainase',
    description: 'Saluran air pemukiman sempit (Sangat rentan sumbatan kritis & meluap cepat).',
  },
  {
    type: 'Sungai Kecil',
    title: 'Sungai Kecil / Kali',
    description: 'Aliran sungai sekunder atau anak sungai antar permukiman.',
  },
  {
    type: 'Sungai Besar',
    title: 'Sungai Besar / Utama',
    description: 'Sungai utama berkapasitas besar atau titik rawan banjir rob laut.',
  },
];

/**
 * Komponen modal konfirmasi interaktif paska pemotretan.
 * Menampilkan hasil Deep Precision Rescan AI dan memungkinkan relawan 
 * mengonfigurasi jenis area fisik guna mematangkan status keparahan.
 */
export const ReportReviewModal: React.FC<ReportReviewModalProps> = ({
  visible,
  imageUri,
  detectedRatio,
  initialSeverity,
  isSubmitting,
  onConfirm,
  onRetake,
}) => {
  const [selectedArea, setSelectedArea] = useState<AreaType>('Sungai Kecil');
  const [dynamicSeverity, setDynamicSeverity] = useState<TrashVolumeStatus>(initialSeverity);

  // Setel ulang pilihan area default dan kalkulasi awal setiap kali modal dibuka
  useEffect(() => {
    if (visible) {
      try {
        setSelectedArea('Sungai Kecil');
        const calculated = determineSeverityStatus(detectedRatio, 'Sungai Kecil');
        setDynamicSeverity(calculated);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch (error) {
        console.error('[Error ReportReviewModal] Gagal menginisiasi status keparahan:', error);
      }
    }
  }, [visible, detectedRatio]);

  const handleSelectArea = (area: AreaType) => {
    try {
      Haptics.selectionAsync();
      setSelectedArea(area);
      const nextSeverity = determineSeverityStatus(detectedRatio, area);
      setDynamicSeverity(nextSeverity);
    } catch (error) {
      console.error('[Error ReportReviewModal] Gagal memperbarui kalkulasi tipe area:', error);
    }
  };

  const handleConfirmPress = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      await onConfirm(selectedArea);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error(`[Error ReportReviewModal - Confirm] Gagal mengeksekusi pengiriman laporan: ${msg}`);
    }
  };

  const handleRetakePress = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onRetake();
    } catch (error) {
      console.error('[Error ReportReviewModal - Retake] Gagal menutup modal foto ulang:', error);
    }
  };

  const getSeverityBadgeColor = (severity: TrashVolumeStatus): string => {
    switch (severity) {
      case 'Kritis':
        return EcoWarnColors.critical;
      case 'Sedang':
        return EcoWarnColors.warning;
      case 'Ringan':
      default:
        return EcoWarnColors.safe;
    }
  };

  if (!visible) return null;

  const badgeColor = getSeverityBadgeColor(dynamicSeverity);
  const percentStr = `${Math.round(detectedRatio * 100)}%`;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={handleRetakePress}
    >
      <View style={styles.backdrop}>
        <View style={styles.modalContainer}>
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            <View style={styles.header}>
              <Text style={styles.headerTitle}>Konfirmasi Bukti & Lokasi</Text>
              <Text style={styles.headerSubtitle}>
                Hasil scan ulang AI telah dikunci. Tentukan spesifikasi saluran air untuk melogikakan status peringatan!
              </Text>
            </View>

            {/* Pratinjau Foto Hasil Deep Rescan */}
            {imageUri && (
              <View style={styles.imagePreviewWrapper}>
                <Image source={{ uri: imageUri }} style={styles.imagePreview} resizeMode="cover" />
                <View style={[styles.aiOverlayBadge, { backgroundColor: badgeColor }]}>
                  <Text style={styles.aiOverlayText}>
                    🤖 AI Score: {percentStr} ({dynamicSeverity})
                  </Text>
                </View>
              </View>
            )}

            {/* Pemilih Tipe Area (Area Type Selector) */}
            <Text style={styles.sectionTitle}>Pilih Jenis Area Aliran Air</Text>
            <View style={styles.optionsContainer}>
              {AREA_OPTIONS.map((item) => {
                const isSelected = selectedArea === item.type;
                return (
                  <TouchableOpacity
                    key={item.type}
                    style={[
                      styles.optionCard,
                      isSelected && styles.optionCardSelected,
                    ]}
                    onPress={() => handleSelectArea(item.type)}
                    activeOpacity={0.8}
                    disabled={isSubmitting}
                  >
                    <View style={styles.optionTextContent}>
                      <Text style={[styles.optionTitle, isSelected && styles.optionTitleSelected]}>
                        {item.title}
                      </Text>
                      <Text style={styles.optionDesc}>{item.description}</Text>
                    </View>
                    <View style={[styles.radioButton, isSelected && styles.radioButtonActive]}>
                      {isSelected && <View style={styles.radioButtonInner} />}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Ringkasan Status Keparahan */}
            <View style={styles.summaryCard}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Status Peringatan Dini Terkalibrasi:</Text>
                <View style={[styles.statusBadge, { backgroundColor: badgeColor }]}>
                  <Text style={styles.statusText}>{dynamicSeverity.toUpperCase()}</Text>
                </View>
              </View>
              {dynamicSeverity === 'Kritis' && (
                <Text style={styles.criticalWarningText}>
                  ⚠️ PERHATIAN: Laporan berstatus KRITIS ini akan langsung menyebarkan siaran darurat ke seluruh warga dan relawan di zona 500 meter!
                </Text>
              )}
            </View>

            {/* Tombol Aksi Kendali */}
            <View style={styles.actionsContainer}>
              <TouchableOpacity
                style={[styles.confirmButton, { backgroundColor: badgeColor }]}
                onPress={handleConfirmPress}
                disabled={isSubmitting}
                activeOpacity={0.85}
              >
                {isSubmitting ? (
                  <View style={styles.loadingRow}>
                    <ActivityIndicator color="#FFFFFF" size="small" />
                    <Text style={styles.confirmButtonText}>Mengirim...</Text>
                  </View>
                ) : (
                  <Text style={styles.confirmButtonText}>Kirim Laporan</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.retakeButton}
                onPress={handleRetakePress}
                disabled={isSubmitting}
                activeOpacity={0.8}
              >
                <Text style={styles.retakeButtonText}>🔄 Ulangi Foto (Batalkan)</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: EcoWarnColors.cardBg,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    maxHeight: '90%',
    ...Shadows.elevated,
  },
  scrollContent: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xxl,
  },
  header: {
    marginBottom: Spacing.md,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: EcoWarnColors.textPrimary,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: EcoWarnColors.textSecondary,
    lineHeight: 20,
  },
  imagePreviewWrapper: {
    width: '100%',
    height: 220,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    marginBottom: Spacing.lg,
    backgroundColor: '#000000',
    position: 'relative',
  },
  imagePreview: {
    width: '100%',
    height: '100%',
  },
  aiOverlayBadge: {
    position: 'absolute',
    bottom: Spacing.sm,
    left: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: BorderRadius.pill,
    ...Shadows.card,
  },
  aiOverlayText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: EcoWarnColors.textPrimary,
    marginBottom: Spacing.sm,
  },
  optionsContainer: {
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    backgroundColor: EcoWarnColors.surface,
    borderRadius: BorderRadius.lg,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  optionCardSelected: {
    backgroundColor: EcoWarnColors.primarySurface,
    borderColor: EcoWarnColors.primary,
    ...Shadows.card,
  },
  optionIconWrapper: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: BorderRadius.md,
    marginRight: Spacing.md,
  },
  optionIcon: {
    fontSize: 22,
  },
  optionTextContent: {
    flex: 1,
    marginRight: Spacing.sm,
  },
  optionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: EcoWarnColors.textPrimary,
  },
  optionTitleSelected: {
    color: EcoWarnColors.primary,
  },
  optionDesc: {
    fontSize: 12,
    color: EcoWarnColors.textSecondary,
    marginTop: 2,
    lineHeight: 16,
  },
  radioButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: EcoWarnColors.borderInput,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioButtonActive: {
    borderColor: EcoWarnColors.primary,
    backgroundColor: EcoWarnColors.primaryMuted,
  },
  radioButtonInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: EcoWarnColors.primary,
  },
  summaryCard: {
    padding: Spacing.md,
    backgroundColor: EcoWarnColors.surface,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.xl,
    borderWidth: 1,
    borderColor: EcoWarnColors.border,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: EcoWarnColors.textPrimary,
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
  },
  statusText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14,
  },
  criticalWarningText: {
    marginTop: Spacing.sm,
    fontSize: 12,
    color: EcoWarnColors.critical,
    fontWeight: '600',
    lineHeight: 18,
  },
  actionsContainer: {
    gap: Spacing.sm,
  },
  confirmButton: {
    width: '100%',
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.elevated,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  confirmButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  retakeButton: {
    width: '100%',
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: EcoWarnColors.surface,
    borderWidth: 1,
    borderColor: EcoWarnColors.border,
  },
  retakeButtonText: {
    color: EcoWarnColors.textSecondary,
    fontSize: 15,
    fontWeight: '600',
  },
});
