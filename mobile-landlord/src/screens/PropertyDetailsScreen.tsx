import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Card, Title, Button } from 'react-native-paper';

const PropertyDetailsScreen = ({ route, navigation }: any) => {
  const { propertyId } = route.params;

  return (
    <ScrollView style={styles.container}>
      <Card style={styles.card}>
        <Card.Content>
          <Title>Property Details</Title>
          <Text>Property ID: {propertyId}</Text>
          <Text>Detailed property information will be displayed here</Text>
        </Card.Content>
      </Card>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  card: { margin: 16, elevation: 2 },
});

export default PropertyDetailsScreen;