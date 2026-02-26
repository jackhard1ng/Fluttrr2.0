import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '@/constants/colors';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { useAuthStore } from '@/stores/auth.store';
import { businessApi } from '@/api/business';
import { extractErrorMessage } from '@/utils/error';

export default function BizProfileScreen() {
  const router = useRouter();
  const { business, logout, setBusiness } = useAuthStore();

  const [editing, setEditing] = useState(false);
  const [businessName, setBusinessName] = useState(business?.businessName || '');
  const [description, setDescription] = useState(business?.description || '');
  const [address, setAddress] = useState(business?.address || '');
  const [phone, setPhone] = useState(business?.phone || '');
  const [website, setWebsite] = useState(business?.website || '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data } = await businessApi.updateProfile({
        businessName: businessName.trim(),
        description: description.trim() || undefined,
        address: address.trim(),
        phone: phone.trim() || undefined,
        website: website.trim() || undefined,
      });
      setBusiness(data);
      setEditing(false);
      Alert.alert('Saved', 'Profile updated!');
    } catch (err) {
      Alert.alert('Error', extractErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Business Profile</Text>
        {!editing && (
          <Button title="Edit" onPress={() => setEditing(true)} variant="ghost" small full={false} />
        )}
      </View>

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Card variant="bordered" style={styles.profileCard}>
          <Text style={styles.bizEmoji}>🏪</Text>
          <Text style={styles.bizName}>{business?.businessName}</Text>
          <Badge
            label={business?.verified ? '✅ Verified' : '⏳ Pending'}
            color={business?.verified ? Colors.success : Colors.warn}
            style={{ marginTop: 8 }}
          />
        </Card>

        {editing ? (
          <View style={styles.editForm}>
            <Input label="Business Name" value={businessName} onChangeText={setBusinessName} />
            <Input label="Description" value={description} onChangeText={setDescription} multiline />
            <Input label="Address" value={address} onChangeText={setAddress} />
            <Input label="Phone" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
            <Input label="Website" value={website} onChangeText={setWebsite} keyboardType="url" autoCapitalize="none" />
            <View style={styles.editActions}>
              <Button title="Cancel" onPress={() => setEditing(false)} variant="secondary" small full={false} />
              <Button title="Save" onPress={handleSave} loading={saving} small full={false} />
            </View>
          </View>
        ) : (
          <Card style={styles.detailsCard}>
            <DetailRow emoji="📧" label="Email" value={business?.email || ''} />
            <DetailRow emoji="📍" label="Address" value={business?.address || ''} />
            {business?.phone && <DetailRow emoji="📞" label="Phone" value={business.phone} />}
            {business?.website && <DetailRow emoji="🌐" label="Website" value={business.website} />}
            {business?.description && <DetailRow emoji="📝" label="About" value={business.description} />}
          </Card>
        )}

        <Card style={styles.menuCard}>
          <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/(business)/(profile)/reviews')}>
            <Text style={styles.menuEmoji}>⭐</Text>
            <Text style={styles.menuLabel}>Reviews</Text>
            <Text style={styles.menuArrow}>›</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/(business)/(profile)/subscriptions')}>
            <Text style={styles.menuEmoji}>💳</Text>
            <Text style={styles.menuLabel}>Subscription</Text>
            <Text style={styles.menuArrow}>›</Text>
          </TouchableOpacity>
        </Card>

        <Button title="Sign Out" onPress={() => {
          Alert.alert('Sign Out', 'Are you sure?', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Sign Out', style: 'destructive', onPress: logout },
          ]);
        }} variant="danger" style={{ marginTop: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function DetailRow({ emoji, label, value }: { emoji: string; label: string; value: string }) {
  return (
    <View style={detailStyles.row}>
      <Text style={detailStyles.emoji}>{emoji}</Text>
      <View style={detailStyles.info}>
        <Text style={detailStyles.label}>{label}</Text>
        <Text style={detailStyles.value}>{value}</Text>
      </View>
    </View>
  );
}

const detailStyles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 10, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: Colors.border },
  emoji: { fontSize: 16, marginTop: 2 },
  info: { flex: 1 },
  label: { fontSize: 12, color: Colors.textSecondary },
  value: { fontSize: 14, color: Colors.text, marginTop: 2 },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.dark },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 10 },
  headerTitle: { fontSize: 22, fontWeight: '700', color: Colors.text },
  scroll: { paddingHorizontal: 16, paddingBottom: 80, paddingTop: 8 },
  profileCard: { alignItems: 'center', paddingVertical: 20, marginBottom: 16 },
  bizEmoji: { fontSize: 48 },
  bizName: { fontSize: 20, fontWeight: '700', color: Colors.text, marginTop: 8 },
  editForm: { marginTop: 8 },
  editActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 8 },
  detailsCard: { marginBottom: 16 },
  menuCard: { marginBottom: 16 },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    gap: 10,
  },
  menuEmoji: { fontSize: 16 },
  menuLabel: { flex: 1, fontSize: 15, color: Colors.text },
  menuArrow: { fontSize: 18, color: Colors.textMuted },
});
