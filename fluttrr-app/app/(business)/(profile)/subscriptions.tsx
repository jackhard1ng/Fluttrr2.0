import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  Linking,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '@/constants/colors';
import { Layout } from '@/constants/layout';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { stripeApi } from '@/api/business';

interface PlanConfig {
  name: string;
  key: 'FREE' | 'GROWTH' | 'PRO';
  price: string;
  period: string;
  features: string[];
}

const PLANS: PlanConfig[] = [
  {
    name: 'Free',
    key: 'FREE',
    price: '$0',
    period: '/mo',
    features: ['5 events/mo', 'Basic analytics'],
  },
  {
    name: 'Growth',
    key: 'GROWTH',
    price: '$29',
    period: '/mo',
    features: ['Unlimited events', 'Full analytics', 'Priority support'],
  },
  {
    name: 'Pro',
    key: 'PRO',
    price: '$49',
    period: '/mo',
    features: ['Everything in Growth', 'Promoted events', 'Dedicated support'],
  },
];

export default function BizSubsScreen() {
  const [currentTier, setCurrentTier] = useState('FREE');
  const [hasSubscription, setHasSubscription] = useState(false);
  const [loading, setLoading] = useState(true);
  const [upgrading, setUpgrading] = useState<string | null>(null);

  useEffect(() => {
    stripeApi.status()
      .then(({ data }) => {
        setCurrentTier(data.tier);
        setHasSubscription(data.hasSubscription);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleUpgrade = async (plan: PlanConfig) => {
    if (plan.key === 'FREE') return;
    setUpgrading(plan.key);
    try {
      const { data } = await stripeApi.checkout(plan.key as 'GROWTH' | 'PRO');
      if (data.url) {
        await Linking.openURL(data.url);
      }
    } catch (err: any) {
      const msg = err?.response?.data?.error || 'Unable to start checkout';
      Alert.alert('Error', msg);
    } finally {
      setUpgrading(null);
    }
  };

  const handleManage = async () => {
    try {
      const { data } = await stripeApi.portal();
      if (data.url) {
        await Linking.openURL(data.url);
      }
    } catch {
      Alert.alert('Error', 'Unable to open billing portal');
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={s.container}>
        <ScreenHeader title="Subscription" showBack />
        <View style={s.loadingWrap}>
          <ActivityIndicator size="large" color={Colors.blue} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.container}>
      <ScreenHeader title="Subscription" showBack />

      <ScrollView contentContainerStyle={s.scroll}>
        {PLANS.map((plan) => {
          const isCurrent = plan.key === currentTier;
          return (
            <View
              key={plan.key}
              style={[s.planCard, isCurrent && s.planCardCurrent]}
            >
              <View style={s.planHeader}>
                <View>
                  <Text style={s.planName}>{plan.name}</Text>
                  <Text style={s.planPrice}>
                    {plan.price}
                    <Text style={s.planPeriod}>{plan.period}</Text>
                  </Text>
                </View>
                {isCurrent && <Badge label="Current" color={Colors.success} />}
              </View>

              <View style={s.features}>
                {plan.features.map((feat, i) => (
                  <View key={i} style={s.featureRow}>
                    <Text style={s.featureCheck}>✓</Text>
                    <Text style={s.featureLabel}>{feat}</Text>
                  </View>
                ))}
              </View>

              {!isCurrent && plan.key !== 'FREE' && (
                <Button
                  title={upgrading === plan.key ? 'Loading...' : 'Upgrade'}
                  onPress={() => handleUpgrade(plan)}
                  variant="outline"
                  small
                  disabled={!!upgrading}
                />
              )}
            </View>
          );
        })}

        {hasSubscription && (
          <Button
            title="Manage Subscription"
            onPress={handleManage}
            variant="outline"
            style={{ marginTop: 8 }}
          />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.dark },
  scroll: { paddingHorizontal: 16, paddingBottom: 40 },
  loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  planCard: {
    backgroundColor: Colors.surface,
    borderRadius: Layout.radius.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 12,
  },
  planCardCurrent: {
    borderColor: Colors.blue,
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  planName: { fontSize: 16, fontWeight: '700', color: Colors.text },
  planPrice: { fontSize: 20, fontWeight: '700', color: Colors.blue, marginTop: 2 },
  planPeriod: { fontSize: 12, fontWeight: '400', color: Colors.textMuted },
  features: { marginBottom: 12 },
  featureRow: { flexDirection: 'row', gap: 8, marginBottom: 4 },
  featureCheck: { fontSize: 12, color: Colors.success },
  featureLabel: { fontSize: 13, color: Colors.textSecondary },
});
