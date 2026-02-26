import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { Image } from 'expo-image';
import { Colors } from '@/constants/colors';

interface AvatarProps {
  uri?: string | null;
  emoji?: string;
  size?: number;
  bg?: string;
  ring?: string;
  style?: ViewStyle;
}

export function Avatar({
  uri,
  emoji,
  size = 40,
  bg = Colors.surface,
  ring,
  style,
}: AvatarProps) {
  const borderRadius = size / 2;

  return (
    <View
      style={[
        {
          width: size,
          height: size,
          borderRadius,
          backgroundColor: bg,
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
        },
        ring && { borderWidth: 2, borderColor: ring },
        style,
      ]}
    >
      {uri ? (
        <Image
          source={{ uri }}
          style={{ width: size, height: size, borderRadius }}
          contentFit="cover"
          transition={200}
        />
      ) : (
        <Text style={{ fontSize: size * 0.5 }}>{emoji || '👤'}</Text>
      )}
    </View>
  );
}

// Stacked avatar group (like PeopleAvatars in the prototype)
interface AvatarGroupProps {
  items: { uri?: string | null; emoji?: string }[];
  max?: number;
  size?: number;
  extraCount?: number;
}

export function AvatarGroup({
  items,
  max = 4,
  size = 24,
  extraCount,
}: AvatarGroupProps) {
  const visible = items.slice(0, max);
  const remaining = extraCount ?? Math.max(0, items.length - max);

  return (
    <View style={styles.group}>
      {visible.map((item, i) => (
        <View
          key={i}
          style={[
            { marginLeft: i === 0 ? 0 : -6, zIndex: max - i },
          ]}
        >
          <Avatar
            uri={item.uri}
            emoji={item.emoji}
            size={size}
            bg={Colors.surface}
            style={{ borderWidth: 2, borderColor: Colors.card }}
          />
        </View>
      ))}
      {remaining > 0 && (
        <Text style={styles.groupExtra}>+{remaining}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  group: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  groupExtra: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginLeft: 4,
  },
});
