import { useRouter } from "expo-router";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import { colors, spacing } from "../constants/theme";

export default function PrivacyPolicyScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backButton}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Privacy Policy</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.lastUpdated}>Last updated: May 6, 2026</Text>

        <Text style={styles.sectionTitle}>1. Introduction</Text>
        <Text style={styles.paragraph}>
          Welcome to WOSH (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;). We are committed to protecting your personal information and your right to privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our mobile application and services.
        </Text>

        <Text style={styles.sectionTitle}>2. Information We Collect</Text>
        <Text style={styles.subTitle}>2.1 Personal Information</Text>
        <Text style={styles.paragraph}>
          We collect the following personal information when you create an account or use our services:
        </Text>
        <Text style={styles.bullet}>• Name and contact information (email address, phone number)</Text>
        <Text style={styles.bullet}>• Profile information (profile picture, if provided)</Text>
        <Text style={styles.bullet}>• Vehicle information (make, model, year, license plate number, plate region)</Text>
        <Text style={styles.bullet}>• Location data (addresses you save for service delivery)</Text>
        <Text style={styles.bullet}>• Payment information (processed securely through Stripe)</Text>

        <Text style={styles.subTitle}>2.2 Usage Data</Text>
        <Text style={styles.paragraph}>
          We automatically collect certain information when you use our app:
        </Text>
        <Text style={styles.bullet}>• Device information (device type, operating system, unique device identifiers)</Text>
        <Text style={styles.bullet}>• App usage data (pages visited, features used, booking history)</Text>
        <Text style={styles.bullet}>• Location data (when you grant permission, to provide location-based services)</Text>

        <Text style={styles.sectionTitle}>3. How We Use Your Information</Text>
        <Text style={styles.paragraph}>
          We use your information for the following purposes:
        </Text>
        <Text style={styles.bullet}>• To provide and maintain our car wash booking services</Text>
        <Text style={styles.bullet}>• To process and manage your bookings and payments</Text>
        <Text style={styles.bullet}>• To send you booking confirmations, updates, and notifications</Text>
        <Text style={styles.bullet}>• To communicate with you about your account or services</Text>
        <Text style={styles.bullet}>• To improve our services and user experience</Text>
        <Text style={styles.bullet}>• To comply with legal obligations</Text>

        <Text style={styles.sectionTitle}>4. Data Sharing and Disclosure</Text>
        <Text style={styles.paragraph}>
          We may share your information with:
        </Text>
        <Text style={styles.bullet}>• Service providers (payment processing, analytics, hosting)</Text>
        <Text style={styles.bullet}>• Business partners (car wash teams who fulfill your bookings)</Text>
        <Text style={styles.bullet}>• Legal authorities (when required by law or to protect our rights)</Text>
        <Text style={styles.paragraph}>
          We do not sell your personal information to third parties.
        </Text>

        <Text style={styles.sectionTitle}>5. Data Security</Text>
        <Text style={styles.paragraph}>
          We implement appropriate technical and organizational measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction. However, no method of transmission over the Internet or electronic storage is 100% secure.
        </Text>

        <Text style={styles.sectionTitle}>6. Data Retention</Text>
        <Text style={styles.paragraph}>
          We retain your personal information for as long as necessary to provide you with our services and as described in this Privacy Policy. We will also retain and use your information as necessary to comply with our legal obligations, resolve disputes, and enforce our agreements.
        </Text>

        <Text style={styles.sectionTitle}>7. Your Rights</Text>
        <Text style={styles.paragraph}>
          Depending on your location, you may have the following rights regarding your personal information:
        </Text>
        <Text style={styles.bullet}>• Access and receive a copy of your personal data</Text>
        <Text style={styles.bullet}>• Rectify inaccurate or incomplete personal data</Text>
        <Text style={styles.bullet}>• Request deletion of your personal data</Text>
        <Text style={styles.bullet}>• Object to or restrict the processing of your personal data</Text>
        <Text style={styles.bullet}>• Data portability (receive your data in a structured, machine-readable format)</Text>
        <Text style={styles.bullet}>• Withdraw consent at any time</Text>

        <Text style={styles.sectionTitle}>8. Account Deletion</Text>
        <Text style={styles.paragraph}>
          You have the right to request deletion of your account and associated data. To delete your account:
        </Text>
        <Text style={styles.bullet}>• Go to your Profile in the app</Text>
        <Text style={styles.bullet}>• Select &quot;Delete Account&quot;</Text>
        <Text style={styles.bullet}>• Confirm your decision</Text>
        <Text style={styles.paragraph}>
          Upon account deletion, we will:
        </Text>
        <Text style={styles.bullet}>• Delete your personal information from our active databases</Text>
        <Text style={styles.bullet}>• Anonymize booking records for business analytics (no personal data retained)</Text>
        <Text style={styles.bullet}>• Remove your access to the service</Text>
        <Text style={styles.paragraph}>
          Please note that we may retain certain information as required by law or for legitimate business purposes (e.g., financial records for tax compliance).
        </Text>

        <Text style={styles.sectionTitle}>9. Children&apos;s Privacy</Text>
        <Text style={styles.paragraph}>
          Our services are not intended for individuals under the age of 18. We do not knowingly collect personal information from children under 18. If we become aware that we have collected personal information from a child under 18, we will take steps to delete such information.
        </Text>

        <Text style={styles.sectionTitle}>10. Changes to This Privacy Policy</Text>
        <Text style={styles.paragraph}>
          We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the &quot;Last updated&quot; date. You are advised to review this Privacy Policy periodically for any changes.
        </Text>

        <Text style={styles.sectionTitle}>11. Contact Us</Text>
        <Text style={styles.paragraph}>
          If you have any questions about this Privacy Policy or our data practices, please contact us at:
        </Text>
        <Text style={styles.contact}>Email: privacy@wosh.ae</Text>
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
