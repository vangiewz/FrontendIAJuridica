import { Redirect } from 'expo-router';
import { useSesion } from '../src/controllers/auth/useSesion';
import { View, ActivityIndicator } from 'react-native';

export default function Index() {
  const { usuario, cargando } = useSesion();

  if (cargando) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (usuario) {
    return <Redirect href="/(app)/" />;
  } else {
    return <Redirect href="/(auth)/login" />;
  }
}
