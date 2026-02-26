import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '@/constants/colors';
import { Layout } from '@/constants/layout';
import { ScreenHeader } from '@/components/ui/ScreenHeader';

interface ToggleRowProps {
  label: string;
  value: boolean;
  onToggle: (val: boolean) => void;
  last?: boolean;
}

function ToggleRow({ label, value, onToggle, last }: ToggleRowProps) {
  return (
    <View style={[s.toggleRow, !last && s.toggleBorder]}>
      <Text style={s.toggleLabel}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{ false: Colors.border, true: Colors.blue }}
        thumbColor="#fff"
      />
    </View>
  );
}

export default function PrivacyScreen() {
  const [profileVisible, setProfileVisible] = useState(true);
  const [onlineStatus, setOnlineStatus] = useState(true);
  const [messagesFromAnyone, setMessagesFromAnyone] = useState(false);
  const [showDistance, setShowDistance] = useState(false);

  return (
    <SafeAreaView style={s.container}>
      <ScreenHeader title="Privacy" showBack />

      <View style={s.content}>
        <View style={s.toggleGroup}>
          <ToggleRow
            label="Profile visible"
            value={profileVisible}
            onToggle={setProfileVisible}
          />
          <ToggleRow
            label="Online status"
            value={onlineStatus}
            onToggle={setOnlineStatus}
          />
          <ToggleRow
            label="Messages from anyone"
            value={messagesFromAnyone}
            onToggle={setMessagesFromAnyone}
          />
          <ToggleRow
            label="Show distance"
            value={showDistance}
            onToggle={setShowDistance}
            last
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.dark },
  content: { paddingHorizontal: 16, paddingTop: 12 },
  toggleGroup: {
    backgroundColor: Colors.surface,
    borderRadius: Layout.radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  toggleBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  toggleLabel: { fontSize: 15, color: Colors.text },
});
