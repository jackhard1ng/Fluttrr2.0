import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '@/constants/colors';
import { Layout } from '@/constants/layout';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';

interface PlanFeature {
  label: string;
}

interface Plan {
  name: string;
  price: string;
  period: string;
  features: PlanFeature[];
  current?: boolean;
}

const PLANS: Plan[] = [
  {
    name: 'Free',
    price: '$0',
    period: '/mo',
    features: [
      { label: '5 events/mo' },
      { label: 'Basic analytics' },
    ],
    current: true,
  },
  {
    name: 'Growth',
    price: '$29',
    period: '/mo',
    features: [
      { label: 'Unlimited events' },
      { label: 'Full analytics' },
      { label: 'Priority support' },
    ],
  },
  {
    name: 'Pro',
    price: '$49',
    period: '/mo',
    features: [
      { label: 'Everything in Growth' },
      { label: 'Promoted events' },
      { label: 'Dedicated support' },
    ],
  },
];

export default function BizSubsScreen() {
  const handleUpgrade = (plan: Plan) => {
    Alert.alert(
      'Coming Soon',
      `${plan.name} plan upgrades will be available soon! We'll notify you when billing is ready.`,
    );
  };

  return (
    <SafeAreaView style={s.container}>
      <ScreenHeader title="Subscription" showBack />

      <ScrollView contentContainerStyle={s.scroll}>
        {PLANS.map((plan) => (
          <View
            key={plan.name}
            style={[s.planCard, plan.current && s.planCardCurrent]}
          >
            <View style={s.planHeader}>
              <View>
                <Text style={s.planName}>{plan.name}</Text>
                <Text style={s.planPrice}>
                  {plan.price}
                  <Text style={s.planPeriod}>{plan.period}</Text>
                </Text>
              </View>
              {plan.current && <Badge label="Current" color={Colors.success} />}
            </View>

            <View style={s.features}>
              {plan.features.map((feat, i) => (
                <View key={i} style={s.featureRow}>
                  <Text style={s.featureCheck}>✓</Text>
                  <Text style={s.featureLabel}>{feat.label}</Text>
                </View>
              ))}
            </View>

            {!plan.current && (
              <Button
                title="Upgrade"
                onPress={() => handleUpgrade(plan)}
                variant="outline"
                small
              />
            )}
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.dark },
  scroll: { paddingHorizontal: 16, paddingBottom: 40 },
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
