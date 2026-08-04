import React, { useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { EcoWarnColors, Spacing, BorderRadius, Shadows } from '../../constants/theme';

export type CustomAlertType = 'critical' | 'warning' | 'success' | 'info' | 'error';

export interface AlertAction {
  text: string;
  onPress?: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
}

export interface CustomAlertModalProps {
  visible: boolean;
  type?: CustomAlertType;
  title: string;
  message: string;
  actions?: AlertAction[];
  onDismiss?: () => void;
}

/**
 * Komponen Custom Alert modular bergaya enterprise untuk merespons 
 * event Real-Time Socket.io maupun hasil eksekusi API.
 */
export const CustomAlertModal: React.FC<CustomAlertModalProps> = ({
  visible,
  type = 'info',
  title,
  message,
  actions = [],
  onDismiss,
}) => {
  // Pemicu Haptic Feedback sesuai tingkat urgensi peringatan (EWS)
  useEffect(() => {
    if (!visible) return;
    try {
      if (type === 'critical' || type === 'error') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      } else if (type === 'warning') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (error) {
      console.error('[Error CustomAlertModal] Gagal menjalankan Haptics:', error);
    }
  }, [visible, type]);

  if (!visible) return null;

  const getConfig = (alertType: CustomAlertType) => {
    switch (alertType) {
      case 'critical':
        return {
          icon: '🚨',
          borderColor: EcoWarnColors.critical,
          headerBg: EcoWarnColors.criticalSurface,
          badgeText: 'BAHAYA KRITIS',
          badgeColor: EcoWarnColors.critical,
        };
      case 'warning':
        return {
          icon: '⚠️',
          borderColor: EcoWarnColors.warning,
          headerBg: EcoWarnColors.warningSurface,
          badgeText: 'WASPADA & POTENSI BANJIR',
          badgeColor: EcoWarnColors.warningDark,
        };
      case 'success':
        return {
          icon: '🟢',
          borderColor: EcoWarnColors.safe,
          headerBg: EcoWarnColors.safeSurface,
          badgeText: 'ZONA STERIL / BERHASIL',
          badgeColor: EcoWarnColors.safeDark,
        };
      case 'error':
        return {
          icon: '❌',
          borderColor: EcoWarnColors.criticalDark,
          headerBg: EcoWarnColors.criticalSurface,
          badgeText: 'GALAT SISTEM / API',
          badgeColor: EcoWarnColors.criticalDark,
        };
      case 'info':
      default:
        return {
          icon: '🔔',
          borderColor: EcoWarnColors.primary,
          headerBg: EcoWarnColors.primarySurface,
          badgeText: 'NOTIFIKASI ECOWARN',
          badgeColor: EcoWarnColors.primaryDark,
        };
    }
  };

  const config = getConfig(type);
  const defaultAction: AlertAction[] =
    actions.length > 0
      ? actions
      : [{ text: 'Mengerti', onPress: onDismiss, variant: 'primary' }];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onDismiss}
    >
      <TouchableWithoutFeedback onPress={onDismiss}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={[styles.alertCard, { borderTopColor: config.borderColor }]}>
              <View style={[styles.headerContainer, { backgroundColor: config.headerBg }]}>
                <Text style={styles.icon}>{config.icon}</Text>
                <View style={[styles.badge, { borderColor: config.badgeColor }]}>
                  <Text style={[styles.badgeText, { color: config.badgeColor }]}>
                    {config.badgeText}
                  </Text>
                </View>
              </View>

              <View style={styles.contentContainer}>
                <Text style={styles.title}>{title}</Text>
                <Text style={styles.message}>{message}</Text>
              </View>

              <View style={styles.actionsContainer}>
                {defaultAction.map((action, index) => {
                  const variant = action.variant || (index === 0 ? 'primary' : 'secondary');
                  const isPrimary = variant === 'primary';
                  const isDanger = variant === 'danger';

                  return (
                    <TouchableOpacity
                      key={index}
                      style={[
                        styles.button,
                        isPrimary && styles.buttonPrimary,
                        isDanger && styles.buttonDanger,
                        !isPrimary && !isDanger && styles.buttonSecondary,
                      ]}
                      activeOpacity={0.8}
                      onPress={() => {
                        try {
                          action.onPress?.();
                        } catch (error) {
                          console.error('[Error CustomAlertModal] Gagal menjalankan callback tombol:', error);
                        }
                        if (onDismiss && !action.onPress) {
                          onDismiss();
                        }
                      }}
                    >
                      <Text
                        style={[
                          styles.buttonText,
                          (isPrimary || isDanger) ? styles.textLight : styles.textDark,
                        ]}
                      >
                        {action.text}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
  },
  alertCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: EcoWarnColors.cardBg,
    borderRadius: BorderRadius.lg,
    borderTopWidth: 6,
    overflow: 'hidden',
    ...Shadows.elevated,
  },
  headerContainer: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: EcoWarnColors.border,
  },
  icon: {
    fontSize: 40,
    marginBottom: Spacing.sm,
  },
  badge: {
    borderWidth: 1,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs - 2,
    borderRadius: BorderRadius.pill,
    backgroundColor: EcoWarnColors.cardBg,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  contentContainer: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: EcoWarnColors.textPrimary,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  message: {
    fontSize: 14,
    lineHeight: 20,
    color: EcoWarnColors.textSecondary,
    textAlign: 'center',
  },
  actionsContainer: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md,
    paddingTop: Spacing.xs,
    gap: Spacing.sm,
  },
  button: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonPrimary: {
    backgroundColor: EcoWarnColors.primary,
    ...Shadows.button,
  },
  buttonDanger: {
    backgroundColor: EcoWarnColors.critical,
  },
  buttonSecondary: {
    backgroundColor: EcoWarnColors.divider,
    borderWidth: 1,
    borderColor: EcoWarnColors.border,
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '700',
  },
  textLight: {
    color: EcoWarnColors.textOnPrimary,
  },
  textDark: {
    color: EcoWarnColors.textPrimary,
  },
});
