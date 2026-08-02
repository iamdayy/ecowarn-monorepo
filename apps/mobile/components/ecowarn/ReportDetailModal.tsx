import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ServerReportResponse } from '../../services/apiService';
import { EcoWarnColors, Spacing, BorderRadius, Shadows } from '../../constants/theme';

interface ReportDetailModalProps {
  visible: boolean;
  report: ServerReportResponse | null;
  onClose: () => void;
}

/**
 * Komponen modal interaktif untuk menampilkan detail komprehensif dari riwayat laporan.
 * Menampilkan bukti foto lapangan dari peladen, status keparahan, dan koordinat GPS.
 */
export const ReportDetailModal: React.FC<ReportDetailModalProps> = ({
  visible,
  report,
  onClose,
}) => {
  if (!report) return null;

  const dateStr = report.createdAt
    ? new Date(report.createdAt).toLocaleString('id-ID', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : 'Waktu tidak terekam';

  const getBadgeStyle = (severity: string) => {
    switch (severity) {
      case 'Kritis':
        return {
          bg: EcoWarnColors.criticalSurface,
          border: EcoWarnColors.critical,
          text: EcoWarnColors.criticalDark,
          icon: '🔴',
          title: 'BAHAYA SUMBATAN / BANJIR ROB',
        };
      case 'Sedang':
        return {
          bg: EcoWarnColors.warningSurface,
          border: EcoWarnColors.warning,
          text: EcoWarnColors.warningDark,
          icon: '🟠',
          title: 'AKUMULASI SAMPAH BERPOTENSI',
        };
      default:
        return {
          bg: EcoWarnColors.safeSurface,
          border: EcoWarnColors.primaryLight,
          text: EcoWarnColors.primary,
          icon: '🟢',
          title: 'PENGAWASAN AMAN / RINGAN',
        };
    }
  };

  const badge = getBadgeStyle(report.severity);
  const [longitude, latitude] = report.location.coordinates;

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          {/* === Header Bar === */}
          <View style={styles.header}>
            <View style={styles.headerTitleContainer}>
              <Text style={styles.headerTitle}>Detail Laporan Spasial</Text>
              <Text style={styles.headerSubtitle}>ID: {report._id.toUpperCase()}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton} activeOpacity={0.7}>
              <Ionicons name="close" size={24} color={EcoWarnColors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.contentScroll} contentContainerStyle={styles.scrollContent}>
            {/* === Status Keparahan Banner === */}
            <View style={[styles.severityBanner, { backgroundColor: badge.bg, borderColor: badge.border }]}>
              <Text style={styles.severityIcon}>{badge.icon}</Text>
              <View style={styles.severityTextWrapper}>
                <Text style={[styles.severityLabel, { color: badge.text }]}>
                  STATUS {report.severity.toUpperCase()}
                </Text>
                <Text style={[styles.severitySublabel, { color: badge.text }]}>
                  {badge.title}
                </Text>
              </View>
            </View>

            {/* === Bukti Foto Lapangan === */}
            <View style={styles.sectionContainer}>
              <Text style={styles.sectionTitle}>📸 Bukti Foto Lapangan</Text>
              {report.photoUrl ? (
                <View style={styles.imageWrapper}>
                  <Image
                    source={{ uri: report.photoUrl }}
                    style={styles.photo}
                    resizeMode="cover"
                  />
                  <View style={styles.photoBadge}>
                    <Text style={styles.photoBadgeText}>✔️ TERVERIFIKASI PELADEN</Text>
                  </View>
                </View>
              ) : (
                <View style={styles.emptyPhotoContainer}>
                  <Ionicons name="camera-outline" size={48} color={EcoWarnColors.textPlaceholder} />
                  <Text style={styles.emptyPhotoTitle}>Bukti Visual Tidak Dilampirkan</Text>
                  <Text style={styles.emptyPhotoSubtitle}>
                    Laporan ini diunggah sebelum aktivasi verifikasi visual publik atau dikirim pada mode hemat bandwidth tanpa lampiran foto.
                  </Text>
                </View>
              )}
            </View>

            {/* === Telemetri & Lokasi Spasial === */}
            <View style={styles.sectionContainer}>
              <Text style={styles.sectionTitle}>📍 Data Geospasial &amp; Waktu</Text>
              
              <View style={styles.metaCard}>
                <View style={styles.metaRow}>
                  <Ionicons name="time-outline" size={20} color={EcoWarnColors.primary} />
                  <View style={styles.metaTextWrapper}>
                    <Text style={styles.metaLabel}>Waktu Pelaporan</Text>
                    <Text style={styles.metaValue}>{dateStr}</Text>
                  </View>
                </View>

                <View style={styles.divider} />

                <View style={styles.metaRow}>
                  <Ionicons name="navigate-outline" size={20} color={EcoWarnColors.primary} />
                  <View style={styles.metaTextWrapper}>
                    <Text style={styles.metaLabel}>Koordinat Titik Lokasi</Text>
                    <Text style={styles.metaValue}>{`Lat: ${latitude.toFixed(6)} · Lng: ${longitude.toFixed(6)}`}</Text>
                  </View>
                </View>

                <View style={styles.divider} />

                <View style={styles.metaRow}>
                  <Ionicons name="shield-checkmark-outline" size={20} color={EcoWarnColors.primary} />
                  <View style={styles.metaTextWrapper}>
                    <Text style={styles.metaLabel}>Metode Validasi AI</Text>
                    <Text style={styles.metaValue}>Client-Side Edge Inference (TFLite YOLO)</Text>
                  </View>
                </View>
              </View>
            </View>
          </ScrollView>

          {/* === Footer Button === */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={onClose}
              activeOpacity={0.8}
            >
              <Text style={styles.actionButtonText}>Tutup Detail Laporan</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const { height } = Dimensions.get('window');

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: EcoWarnColors.cardBg,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: height * 0.88,
    ...Shadows.elevated,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: EcoWarnColors.divider,
  },
  headerTitleContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: EcoWarnColors.textPrimary,
  },
  headerSubtitle: {
    fontSize: 11,
    color: EcoWarnColors.textMuted,
    marginTop: 2,
    fontFamily: 'monospace',
  },
  closeButton: {
    padding: 6,
    borderRadius: BorderRadius.pill,
    backgroundColor: EcoWarnColors.surface,
  },
  contentScroll: {
    flexGrow: 0,
  },
  scrollContent: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  severityBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    marginBottom: Spacing.lg,
  },
  severityIcon: {
    fontSize: 28,
    marginRight: 14,
  },
  severityTextWrapper: {
    flex: 1,
  },
  severityLabel: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  severitySublabel: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  sectionContainer: {
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: EcoWarnColors.textPrimary,
    marginBottom: Spacing.sm,
  },
  imageWrapper: {
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    backgroundColor: EcoWarnColors.surface,
    borderWidth: 1,
    borderColor: EcoWarnColors.border,
    ...Shadows.card,
  },
  photo: {
    width: '100%',
    height: 220,
  },
  photoBadge: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    backgroundColor: 'rgba(4, 120, 87, 0.85)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  photoBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  emptyPhotoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
    backgroundColor: EcoWarnColors.surface,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: EcoWarnColors.border,
    borderStyle: 'dashed',
  },
  emptyPhotoTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: EcoWarnColors.textSecondary,
    marginTop: Spacing.sm,
  },
  emptyPhotoSubtitle: {
    fontSize: 12,
    color: EcoWarnColors.textMuted,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 18,
  },
  metaCard: {
    backgroundColor: EcoWarnColors.surface,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: EcoWarnColors.border,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  metaTextWrapper: {
    marginLeft: 12,
    flex: 1,
  },
  metaLabel: {
    fontSize: 12,
    color: EcoWarnColors.textMuted,
    fontWeight: '500',
  },
  metaValue: {
    fontSize: 14,
    color: EcoWarnColors.textPrimary,
    fontWeight: '600',
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: EcoWarnColors.divider,
    marginVertical: 10,
  },
  footer: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: EcoWarnColors.divider,
    backgroundColor: EcoWarnColors.cardBg,
  },
  actionButton: {
    backgroundColor: EcoWarnColors.primary,
    paddingVertical: 14,
    borderRadius: BorderRadius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.button,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
