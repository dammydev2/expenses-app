import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import type { ComponentProps } from 'react';
import { StyleSheet, View } from 'react-native';

import { categoryColor } from '@/constants/chart-palette';
import { useColorScheme } from '@/hooks/use-color-scheme';

type IconName = ComponentProps<typeof MaterialCommunityIcons>['name'];

/** Round coloured badge with the category's icon. */
export function CategoryIcon({
  icon,
  color,
  size = 40,
}: {
  icon: string;
  color: string;
  size?: number;
}) {
  const scheme = useColorScheme();
  const tint = categoryColor(color, scheme);
  const name = (icon in MaterialCommunityIcons.glyphMap ? icon : 'tag') as IconName;
  return (
    <View
      style={[
        styles.badge,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: `${tint}22` },
      ]}>
      <MaterialCommunityIcons name={name} size={size * 0.55} color={tint} />
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
