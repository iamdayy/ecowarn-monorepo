import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Dimensions,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ServerReportResponse, resolveReportInServer } from '../../services/apiService';
import { EcoWarnColors, Spacing, BorderRadius, Shadows } from '../../constants/theme';
import { useCoordinateAddress } from '../../services/geocodingService';
import { useAuth } from '../../context/AuthContext';

interface ReportDetailModalProps {
  visible: boolean;
  report: ServerReportResponse | null;
  onClose: () => void;
  onReportUpdated?: (updatedReport: ServerReportResponse) => void;
}

/**
 * Komponen modal interaktif untuk menampilkan detail komprehensif dari riwayat laporan.
 * Menampilkan bukti foto lapangan dari peladen, status keparahan, dan koordinat GPS.
 */
export const ReportDetailModal: React.FC<ReportDetailModalProps> = ({
  visible,
  report,
  onClose,
  onReportUpdated,
}) => {
  const { user, token } = useAuth();
  const [isResolving, setIsResolving] = useState<boolean>(false);

  // Aturan Mutlak React Hooks: Semua Hook wajib dieksekusi sebelum pengembalian bersyarat (early return)
  const [longitude, latitude] = report?.location?.coordinates || [undefined, undefined];
  const { address } = useCoordinateAddress(latitude, longitude, 'full');

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

  const handleResolveIncident = async () => {
    if (!token || user?.role !== 'Relawan') {
      Alert.alert('Akses Ditolak', 'Hanya Relawan terverifikasi yang dapat menyelesaikan insiden bahaya ini.');
      return;
    }

    Alert.alert(
      'Konfirmasi Penyelesaian Insiden',
      'Apakah tumpukan sampah dan ancaman banjir rob pada titik ini telah selesai ditangani di lapangan?',
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Ya, Selesai!',
          style: 'default',
          onPress: async () => {
            try {
              setIsResolving(true);
              const updatedReport = await resolveReportInServer(report._id, token);
              Alert.alert('✔️ Berhasil', 'Status zona tuntas diperbarui menjadi steril/selesai. De-eskalasi sedang dikirimkan ke warga!');
              if (onReportUpdated) onReportUpdated(updatedReport);
              onClose();
            } catch (err) {
              Alert.alert('Gagal', err instanceof Error ? err.message : 'Terjadi kesalahan saat memvalidasi resolusi laporan.');
            } finally {
              setIsResolving(false);
            }
          },
        },
      ]
    );
  };

  const getBadgeStyle = (severity: string, status?: string) => {
    if (status === 'RESOLVED') {
      return {
        bg: '#E8F5E9',
        border: '#4CAF50',
        text: '#1B5E20',
        icon: '✔️',
        title: 'ZONA STERIL & SELESAI DITANGANI',
      };
    }
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

  const badge = getBadgeStyle(report.severity, report.status);

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
              <Text style={styles.headerTitle}>Detail Laporan</Text>
              <Text style={styles.headerSubtitle}>ID: {report._id?.toUpperCase() || 'N/A'}</Text>
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
                  {report.status === 'RESOLVED' ? 'STATUS RESOLVED (SELESAI)' : `STATUS ${report.severity?.toUpperCase() || 'UNKNOWN'}`}
                </Text>
                <Text style={[styles.severitySublabel, { color: badge.text }]}>
                  {badge.title}
                </Text>
              </View>
            </View>

            {/* === Spesifikasi Jenis Area === */}
            {report.areaType && (
              <View style={[styles.severityBanner, { backgroundColor: EcoWarnColors.surface, borderColor: EcoWarnColors.border, marginBottom: Spacing.md }]}>
                <Text style={styles.severityIcon}>
                  {report.areaType === 'Selokan' ? '💧' : report.areaType === 'Sungai Besar' ? '🌉' : '🌊'}
                </Text>
                <View style={styles.severityTextWrapper}>
                  <Text style={[styles.severityLabel, { color: EcoWarnColors.textPrimary, fontSize: 14 }]}>
                    JENIS AREA: {report.areaType.toUpperCase()}
                  </Text>
                  <Text style={[styles.severitySublabel, { color: EcoWarnColors.textSecondary }]}>
                    {report.areaType === 'Selokan'
                      ? 'Saluran drainase sempit berisiko kritis dan meluap cepat saat hujan/rob.'
                      : 'Aliran sungai berkapasitas besar dalam pemantauan mitigasi.'}
                  </Text>
                </View>
              </View>
            )}

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

            {/* === Bukti Foto Mitigasi (After Cleaning) === */}
            {report.status === 'RESOLVED' && report.resolvedPhotoUrl && (
              <View style={styles.sectionContainer}>
                <Text style={styles.sectionTitle}>✨ Bukti Mitigasi Selesai (After Cleaning)</Text>
                <View style={styles.imageWrapper}>
                  <Image
                    source={{ uri: report.resolvedPhotoUrl }}
                    style={styles.photo}
                    resizeMode="cover"
                  />
                  <View style={[styles.photoBadge, { backgroundColor: 'rgba(27, 94, 32, 0.9)' }]}>
                    <Text style={styles.photoBadgeText}>✔️ VERIFIKASI ZONA STERIL</Text>
                  </View>
                </View>
              </View>
            )}

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
                  <Ionicons name="map-outline" size={20} color={EcoWarnColors.primary} />
                  <View style={styles.metaTextWrapper}>
                    <Text style={styles.metaLabel}>Alamat Lokasi Lapangan</Text>
                    <Text style={styles.metaValue}>{address}</Text>
                  </View>
                </View>

                <View style={styles.divider} />

                <View style={styles.metaRow}>
                  <Ionicons name="navigate-outline" size={20} color={EcoWarnColors.primary} />
                  <View style={styles.metaTextWrapper}>
                    <Text style={styles.metaLabel}>Koordinat Titik Lokasi</Text>
                    <Text style={styles.metaValue}>{`Lat: ${latitude?.toFixed(6) ?? '0.000000'} · Lng: ${longitude?.toFixed(6) ?? '0.000000'}`}</Text>
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
            {user?.role === 'Relawan' && report.status !== 'RESOLVED' && (
              <TouchableOpacity
                style={styles.resolveButton}
                onPress={handleResolveIncident}
                disabled={isResolving}
                activeOpacity={0.8}
              >
                {isResolving ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.resolveButtonText}>Tandai Selesai Ditangani</Text>
                )}
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[styles.actionButton, user?.role === 'Relawan' && report.status !== 'RESOLVED' && styles.actionButtonSecondary]}
              onPress={onClose}
              activeOpacity={0.8}
            >
              <Text style={[styles.actionButtonText, user?.role === 'Relawan' && report.status !== 'RESOLVED' && styles.actionButtonTextSecondary]}>
                Tutup Detail Laporan
              </Text>
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
  resolveButton: {
    backgroundColor: '#00C853',
    paddingVertical: 14,
    borderRadius: BorderRadius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
    ...Shadows.button,
  },
  resolveButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  actionButtonSecondary: {
    backgroundColor: EcoWarnColors.surface,
    borderWidth: 1,
    borderColor: EcoWarnColors.border,
    elevation: 0,
    shadowOpacity: 0,
  },
  actionButtonTextSecondary: {
    color: EcoWarnColors.textSecondary,
  },
});
