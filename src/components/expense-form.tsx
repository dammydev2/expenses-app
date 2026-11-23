import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { Stack } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CategoryIcon } from '@/components/category-icon';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { MAX_NOTE_LENGTH } from '@/db/repos/expenses';
import type { Category, ExpenseInput } from '@/db/types';
import { useTheme } from '@/hooks/use-theme';
import {
  addDays,
  formatLongDate,
  parseISODate,
  toISODate,
  todayISO,
  type ISODate,
} from '@/utils/dates';
import { centsToInputString, currencySymbol, parseAmountToCents } from '@/utils/money';

export type ExpenseFormValues = {
  amountCents?: number;
  categoryId: string | null;
  spentOn: ISODate;
  note?: string | null;
};

type Props = {
  categories: Category[];
  initialValues: ExpenseFormValues;
  submitLabel: string;
  onSubmit: (input: ExpenseInput) => Promise<void>;
  onDelete?: () => void;
};

export function ExpenseForm({ categories, initialValues, submitLabel, onSubmit, onDelete }: Props) {
  const theme = useTheme();
  const today = todayISO();
  const yesterday = addDays(today, -1);

  const [amountText, setAmountText] = useState(
    initialValues.amountCents ? centsToInputString(initialValues.amountCents) : '',
  );
  const [categoryId, setCategoryId] = useState(initialValues.categoryId);
  const [spentOn, setSpentOn] = useState(initialValues.spentOn);
  const [note, setNote] = useState(initialValues.note ?? '');
  const [showIosPicker, setShowIosPicker] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const amountCents = parseAmountToCents(amountText);

  function openDatePicker() {
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: parseISODate(spentOn),
        mode: 'date',
        maximumDate: new Date(),
        onValueChange: (_event, date) => setSpentOn(toISODate(date)),
      });
    } else {
      setShowIosPicker((visible) => !visible);
    }
  }

  async function handleSubmit() {
    if (saving) return;
    if (amountCents === null) {
      setError('Enter an amount greater than 0, e.g. 65 or 12.50');
      return;
    }
    if (!categoryId) {
      setError('Choose a category');
      return;
    }
    setError(null);
    setSaving(true);
    try {
      await onSubmit({ amountCents, categoryId, spentOn, note });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save the expense');
      setSaving(false);
    }
  }

  const dateChip = (label: string, value: ISODate) => {
    const selected = spentOn === value;
    return (
      <Pressable
        key={label}
        accessibilityRole="button"
        accessibilityState={{ selected }}
        onPress={() => setSpentOn(value)}
        style={[
          styles.chip,
          { borderColor: selected ? theme.tint : theme.border },
          selected && { backgroundColor: theme.tint },
        ]}>
        <ThemedText type="small" style={selected && { color: theme.onTint }}>
          {label}
        </ThemedText>
      </Pressable>
    );
  };

  return (
    <>
      <Stack.Screen
        options={{
          headerRight: () => (
            <Pressable
              accessibilityRole="button"
              onPress={handleSubmit}
              disabled={saving}
              hitSlop={12}>
              <ThemedText type="smallBold" style={{ color: theme.tint, fontSize: 16 }}>
                Save
              </ThemedText>
            </Pressable>
          ),
        }}
      />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          style={{ backgroundColor: theme.background }}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled">
          {/* Amount */}
          <View style={[styles.amountRow, { borderColor: error && amountCents === null ? theme.danger : theme.border }]}>
            <ThemedText style={styles.currency} themeColor="textSecondary">
              {currencySymbol()}
            </ThemedText>
            <TextInput
              accessibilityLabel="Amount"
              autoFocus={!initialValues.amountCents}
              keyboardType="decimal-pad"
              placeholder="0.00"
              placeholderTextColor={theme.textSecondary}
              value={amountText}
              onChangeText={(text) => {
                setAmountText(text);
                if (error) setError(null);
              }}
              style={[styles.amountInput, { color: theme.text }]}
              maxLength={12}
              selectTextOnFocus
            />
          </View>

          {/* Category */}
          <ThemedText type="smallBold" themeColor="textSecondary" style={styles.label}>
            CATEGORY
          </ThemedText>
          <View style={styles.categoryGrid}>
            {categories.map((category) => {
              const selected = category.id === categoryId;
              return (
                <Pressable
                  key={category.id}
                  accessibilityRole="button"
                  accessibilityLabel={category.name}
                  accessibilityState={{ selected }}
                  onPress={() => {
                    setCategoryId(category.id);
                    if (error) setError(null);
                  }}
                  style={[
                    styles.categoryCell,
                    {
                      borderColor: selected ? category.color : theme.border,
                      backgroundColor: selected ? `${category.color}1A` : 'transparent',
                    },
                  ]}>
                  <CategoryIcon icon={category.icon} color={category.color} size={36} />
                  <ThemedText type="small" numberOfLines={1} style={styles.categoryName}>
                    {category.name}
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>

          {/* Date */}
          <ThemedText type="smallBold" themeColor="textSecondary" style={styles.label}>
            DATE
          </ThemedText>
          <View style={styles.chips}>
            {dateChip('Today', today)}
            {dateChip('Yesterday', yesterday)}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Date: ${formatLongDate(spentOn)}. Change date`}
              onPress={openDatePicker}
              style={[
                styles.chip,
                {
                  borderColor:
                    spentOn !== today && spentOn !== yesterday ? theme.tint : theme.border,
                },
              ]}>
              <ThemedText type="small">
                {spentOn !== today && spentOn !== yesterday ? formatLongDate(spentOn) : 'Pick date…'}
              </ThemedText>
            </Pressable>
          </View>
          {Platform.OS === 'ios' && showIosPicker ? (
            <DateTimePicker
              value={parseISODate(spentOn)}
              mode="date"
              display="inline"
              maximumDate={new Date()}
              onValueChange={(_event, date) => setSpentOn(toISODate(date))}
            />
          ) : null}

          {/* Note */}
          <ThemedText type="smallBold" themeColor="textSecondary" style={styles.label}>
            NOTE (OPTIONAL)
          </ThemedText>
          <TextInput
            accessibilityLabel="Note"
            placeholder="e.g. Aldi, weekly shop"
            placeholderTextColor={theme.textSecondary}
            value={note}
            onChangeText={setNote}
            maxLength={MAX_NOTE_LENGTH}
            style={[styles.noteInput, { color: theme.text, borderColor: theme.border }]}
            returnKeyType="done"
            onSubmitEditing={handleSubmit}
          />

          {error ? (
            <ThemedText accessibilityRole="alert" style={[styles.error, { color: theme.danger }]}>
              {error}
            </ThemedText>
          ) : null}

          <Pressable
            accessibilityRole="button"
            onPress={handleSubmit}
            disabled={saving}
            style={({ pressed }) => [
              styles.primaryButton,
              { backgroundColor: theme.tint, opacity: pressed || saving ? 0.7 : 1 },
            ]}>
            {saving ? (
              <ActivityIndicator color={theme.onTint} />
            ) : (
              <ThemedText type="smallBold" style={{ color: theme.onTint, fontSize: 16 }}>
                {submitLabel}
              </ThemedText>
            )}
          </Pressable>

          {onDelete ? (
            <Pressable
              accessibilityRole="button"
              onPress={onDelete}
              disabled={saving}
              style={styles.deleteButton}>
              <ThemedText type="smallBold" style={{ color: theme.danger, fontSize: 16 }}>
                Delete expense
              </ThemedText>
            </Pressable>
          ) : null}

          <SafeAreaView edges={['bottom']} />
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  content: {
    padding: Spacing.three,
    gap: Spacing.two,
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 2,
    paddingBottom: Spacing.one,
    marginBottom: Spacing.two,
  },
  currency: {
    fontSize: 32,
    lineHeight: 44,
    marginRight: Spacing.two,
  },
  amountInput: {
    flex: 1,
    fontSize: 40,
    fontWeight: 600,
    paddingVertical: Spacing.one,
    fontVariant: ['tabular-nums'],
  },
  label: {
    marginTop: Spacing.three,
    letterSpacing: 0.5,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  categoryCell: {
    width: '31%',
    alignItems: 'center',
    gap: Spacing.one,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.one,
    borderWidth: 1.5,
    borderRadius: Spacing.two,
  },
  categoryName: {
    textAlign: 'center',
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  chip: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: 999,
    borderWidth: 1.5,
  },
  noteInput: {
    borderWidth: 1,
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two + Spacing.one,
    fontSize: 16,
  },
  error: {
    marginTop: Spacing.two,
  },
  primaryButton: {
    marginTop: Spacing.four,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
    borderRadius: Spacing.two,
  },
  deleteButton: {
    alignItems: 'center',
    paddingVertical: Spacing.three,
  },
});
