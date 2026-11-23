import { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const AUTO_HIDE_MS = 5000;

/** Bottom message with an optional action, e.g. "Expense deleted · UNDO". */
export function Snackbar({
  message,
  actionLabel,
  onAction,
  onDismiss,
  bottomOffset = 0,
}: {
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  onDismiss: () => void;
  bottomOffset?: number;
}) {
  const theme = useTheme();

  useEffect(() => {
    const timer = setTimeout(onDismiss, AUTO_HIDE_MS);
    return () => clearTimeout(timer);
  }, [message, onDismiss]);

  return (
    <View
      accessibilityLiveRegion="polite"
      style={[styles.container, { backgroundColor: theme.text, bottom: bottomOffset + Spacing.three }]}>
      <ThemedText style={[styles.message, { color: theme.background }]} numberOfLines={2}>
        {message}
      </ThemedText>
      {actionLabel && onAction ? (
        <Pressable accessibilityRole="button" hitSlop={8} onPress={onAction}>
          <ThemedText type="smallBold" style={{ color: theme.tint }}>
            {actionLabel}
          </ThemedText>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: Spacing.three,
    right: Spacing.three,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    borderRadius: Spacing.two,
    elevation: 6,
  },
  message: {
    flex: 1,
  },
});
