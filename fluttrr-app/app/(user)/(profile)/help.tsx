import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '@/constants/colors';
import { Layout } from '@/constants/layout';
import { ScreenHeader } from '@/components/ui/ScreenHeader';

const FAQ_ITEMS = [
  {
    question: 'How do I join an event?',
    answer: 'Tap any event → Join. You\'ll auto-join the group chat and can start chatting with other attendees.',
  },
  {
    question: 'Can I cancel after joining?',
    answer: 'Yes! Go to the event detail page and tap "Leave" to leave the event and its group chat.',
  },
  {
    question: 'How do I report someone?',
    answer: 'Tap the ⋯ menu on any event or profile to access the report option. You can report spam, harassment, or inappropriate content.',
  },
  {
    question: 'How do I block a user?',
    answer: 'Go to Profile → Settings → Blocked Users, or use the report menu on a user\'s profile.',
  },
  {
    question: 'How do events work for businesses?',
    answer: 'Business accounts can create events, manage attendees, and chat with their event groups. Sign up as a business to get started!',
  },
  {
    question: 'Can I bring guests to an event?',
    answer: 'When joining certain events, you\'ll see an option to add guests. The number of extra guests is limited by available spots.',
  },
];

function FAQItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false);

  return (
    <TouchableOpacity style={s.faqItem} onPress={() => setOpen(!open)} activeOpacity={0.7}>
      <View style={s.faqHeader}>
        <Text style={s.faqQuestion}>{question}</Text>
        <Text style={s.faqArrow}>{open ? '−' : '+'}</Text>
      </View>
      {open && <Text style={s.faqAnswer}>{answer}</Text>}
    </TouchableOpacity>
  );
}

export default function HelpScreen() {
  return (
    <SafeAreaView style={s.container}>
      <ScreenHeader title="Help & FAQ" showBack />

      <ScrollView contentContainerStyle={s.scroll}>
        {FAQ_ITEMS.map((item, i) => (
          <FAQItem key={i} question={item.question} answer={item.answer} />
        ))}

        <View style={s.footer}>
          <Text style={s.footerText}>Still need help?</Text>
          <Text style={s.footerEmail}>support@fluttrr.com</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.dark },
  scroll: { paddingHorizontal: 16, paddingBottom: 40 },
  faqItem: {
    backgroundColor: Colors.surface,
    borderRadius: Layout.radius.lg,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 8,
  },
  faqHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  faqQuestion: { fontSize: 15, fontWeight: '500', color: Colors.text, flex: 1, marginRight: 8 },
  faqArrow: { fontSize: 18, color: Colors.textSecondary, fontWeight: '600' },
  faqAnswer: { fontSize: 14, color: Colors.textSecondary, marginTop: 10, lineHeight: 20 },
  footer: { alignItems: 'center', marginTop: 24 },
  footerText: { fontSize: 14, color: Colors.textMuted },
  footerEmail: { fontSize: 15, color: Colors.blue, fontWeight: '600', marginTop: 4 },
});
