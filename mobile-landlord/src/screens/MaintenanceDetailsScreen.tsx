import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Card, Title } from 'react-native-paper';

const MaintenanceDetailsScreen = ({ route }: any) => {
  const { requestId } = route.params;

  return (
    <ScrollView style={styles.container}>
      <Card style={styles.card}>
        <Card.Content>
          <Title>Maintenance Request Details</Title>
          <Text>Request ID: {requestId}</Text>
          <Text>Detailed maintenance request information will be displayed here</Text>
        </Card.Content>
      </Card>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  card: { margin: 16, elevation: 2 },
});

export default MaintenanceDetailsScreen;