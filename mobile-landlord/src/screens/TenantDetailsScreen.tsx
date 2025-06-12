import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Card, Title } from 'react-native-paper';

const TenantDetailsScreen = ({ route }: any) => {
  const { tenantId } = route.params;

  return (
    <ScrollView style={styles.container}>
      <Card style={styles.card}>
        <Card.Content>
          <Title>Tenant Details</Title>
          <Text>Tenant ID: {tenantId}</Text>
          <Text>Detailed tenant information will be displayed here</Text>
        </Card.Content>
      </Card>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  card: { margin: 16, elevation: 2 },
});

export default TenantDetailsScreen;