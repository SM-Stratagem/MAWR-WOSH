import { useRouter } from "expo-router";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import { colors, spacing } from "../constants/theme";

export default function TermsOfUseScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backButton}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Terms of Use</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.lastUpdated}>Last updated: May 6, 2026</Text>

        <Text style={styles.sectionTitle}>1. Acceptance of Terms</Text>
        <Text style={styles.paragraph}>
          By accessing or using the WOSH mobile application and services (&quot;Service&quot;), you agree to be bound by these Terms of Use (&quot;Terms&quot;). If you do not agree to these Terms, please do not use our Service.
        </Text>

        <Text style={styles.sectionTitle}>2. Description of Service</Text>
        <Text style={styles.paragraph}>
          WOSH provides a platform for booking mobile car wash services in the United Arab Emirates. We connect customers with professional car wash teams who provide on-site car cleaning services at the customer&apos;s specified location.
        </Text>

        <Text style={styles.sectionTitle}>3. Account Registration</Text>
        <Text style={styles.paragraph}>
          To use our Service, you must:
        </Text>
        <Text style={styles.bullet}>• Create an account using your email, Google, or Apple credentials</Text>
        <Text style={styles.bullet}>• Provide accurate and complete information</Text>
        <Text style={styles.bullet}>• Maintain the security of your account credentials</Text>
        <Text style={styles.bullet}>• Be at least 18 years old</Text>
        <Text style={styles.paragraph}>
          You are responsible for all activities that occur under your account.
        </Text>

        <Text style={styles.sectionTitle}>4. Booking and Payment</Text>
        <Text style={styles.subTitle}>4.1 Booking Process</Text>
        <Text style={styles.paragraph}>
          When you book a car wash service:
        </Text>
        <Text style={styles.bullet}>• Select your vehicle(s) and wash type</Text>
        <Text style={styles.bullet}>• Choose your location and preferred time window</Text>
        <Text style={styles.bullet}>• Review and confirm your booking</Text>
        <Text style={styles.bullet}>• Payment is processed at the time of booking confirmation</Text>

        <Text style={styles.subTitle}>4.2 Pricing</Text>
        <Text style={styles.paragraph}>
          All prices are displayed in AED (United Arab Emirates Dirham) and include applicable taxes. Prices may vary based on:
        </Text>
        <Text style={styles.bullet}>• Selected wash type</Text>
        <Text style={styles.bullet}>• Number of vehicles</Text>
        <Text style={styles.bullet}>• Subscription plan (if applicable)</Text>

        <Text style={styles.subTitle}>4.3 Cancellation and Refunds</Text>
        <Text style={styles.paragraph}>
          • Free cancellation up to 2 hours before the scheduled time window{'\n'}
          • Cancellations within 2 hours may be subject to a cancellation fee{'\n'}
          • Refunds are processed within 5-10 business days{'\n'}
          • No refunds for completed services
        </Text>

        <Text style={styles.sectionTitle}>5. Subscription Plans</Text>
        <Text style={styles.paragraph}>
          We offer subscription plans that provide discounted rates for regular car wash services:
        </Text>
        <Text style={styles.bullet}>• Weekly Plan: 8 washes per month</Text>
        <Text style={styles.bullet}>• Bi-Weekly Plan: 4 washes per month</Text>
        <Text style={styles.bullet}>• Monthly Plan: 2 washes per month</Text>
        <Text style={styles.paragraph}>
          Subscriptions automatically renew unless canceled. You may cancel your subscription at any time through the app.
        </Text>

        <Text style={styles.sectionTitle}>6. User Responsibilities</Text>
        <Text style={styles.paragraph}>
          You agree to:
        </Text>
        <Text style={styles.bullet}>• Provide accurate vehicle and location information</Text>
        <Text style={styles.bullet}>• Ensure your vehicle is accessible at the scheduled time</Text>
        <Text style={styles.bullet}>• Treat our service teams with respect</Text>
        <Text style={styles.bullet}>• Not use the Service for any illegal or unauthorized purpose</Text>
        <Text style={styles.bullet}>• Comply with all applicable laws and regulations</Text>

        <Text style={styles.sectionTitle}>7. Service Availability</Text>
        <Text style={styles.paragraph}>
          We strive to provide services in Dubai and other supported emirates. Service availability may vary based on location, weather conditions, and team availability. We reserve the right to refuse service in certain areas or conditions.
        </Text>

        <Text style={styles.sectionTitle}>8. Intellectual Property</Text>
        <Text style={styles.paragraph}>
          The WOSH app, including its design, logos, content, and features, is owned by us and protected by intellectual property laws. You may not copy, modify, distribute, or reverse engineer any part of our Service without our prior written consent.
        </Text>

        <Text style={styles.sectionTitle}>9. Limitation of Liability</Text>
        <Text style={styles.paragraph}>
          To the maximum extent permitted by law, WOSH shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including but not limited to:
        </Text>
        <Text style={styles.bullet}>• Damage to your vehicle during or after service</Text>
        <Text style={styles.bullet}>• Loss of profits or data</Text>
        <Text style={styles.bullet}>• Personal injury or property damage</Text>
        <Text style={styles.paragraph}>
          Our total liability shall not exceed the amount you paid for the specific service in question.
        </Text>

        <Text style={styles.sectionTitle}>10. Indemnification</Text>
        <Text style={styles.paragraph}>
          You agree to indemnify and hold harmless WOSH, its officers, directors, employees, and agents from any claims, damages, losses, or expenses (including reasonable attorneys&apos; fees) arising from your use of the Service or violation of these Terms.
        </Text>

        <Text style={styles.sectionTitle}>11. Termination</Text>
        <Text style={styles.paragraph}>
          We may terminate or suspend your account and access to the Service at our sole discretion, without prior notice, for conduct that we believe violates these Terms or is harmful to other users, us, or third parties, or for any other reason.
        </Text>

        <Text style={styles.sectionTitle}>12. Governing Law</Text>
        <Text style={styles.paragraph}>
          These Terms shall be governed by and construed in accordance with the laws of the United Arab Emirates. Any disputes arising from these Terms or the Service shall be subject to the exclusive jurisdiction of the courts of Dubai.
        </Text>

        <Text style={styles.sectionTitle}>13. Changes to Terms</Text>
        <Text style={styles.paragraph}>
          We reserve the right to modify these Terms at any time. We will notify you of any material changes by posting the new Terms on this page and updating the &quot;Last updated&quot; date. Your continued use of the Service after such changes constitutes your acceptance of the new Terms.
        </Text>

        <Text style={styles.sectionTitle}>14. Contact Us</Text>
        <Text style={styles.paragraph}>
          If you have any questions about these Terms, please contact us at:
        </Text>
        <Text style={styles.contact}>Email: legal@wosh.ae</Text>
        <Text style={styles.contact}>Address: Dubai, United Arab Emirates</Text>

        <View style={styles.spacer} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 16,
  },
  backButton: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: "500",
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
    color: colors.text_primary,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  lastUpdated: {
    fontSize: 14,
    color: colors.text_secondary,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: colors.text_primary,
    marginTop: 24,
    marginBottom: 12,
  },
  subTitle: {
    fontSize: 16,
    fontWeight: "500",
    color: colors.text_primary,
    marginTop: 16,
    marginBottom: 8,
  },
  paragraph: {
    fontSize: 14,
    color: colors.text_secondary,
    lineHeight: 22,
    marginBottom: 12,
  },
  bullet: {
    fontSize: 14,
    color: colors.text_secondary,
    lineHeight: 22,
    marginLeft: 16,
    marginBottom: 4,
  },
  contact: {
    fontSize: 14,
    color: colors.primary,
    lineHeight: 22,
    marginBottom: 4,
  },
  spacer: {
    height: 40,
  },
});
