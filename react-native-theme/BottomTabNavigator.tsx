import React, { useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Animated,
  GestureResponderEvent,
} from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTheme } from './ThemeProvider';

// -------------------------------------------------------------
// Demo Screens & Stack Navigation Structure
// -------------------------------------------------------------

// 1. Common Product Detail Page (PDP) screen shared between stacks
function ProductDetailScreen({ route, navigation }: any) {
  const { productId } = route.params || { productId: '1' };
  const { colors } = useTheme();

  return (
    <View style={styles.screen}>
      <Text style={{ fontSize: 18, fontWeight: '800', color: colors.textNearBlack, marginBottom: 8 }}>
        사료 상세 분석 결과 (PDP)
      </Text>
      <Text style={{ fontSize: 12, color: colors.textGray, marginBottom: 24 }}>
        제품 고유 ID: {productId}
      </Text>
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => navigation.goBack()}
        style={{
          paddingVertical: 12,
          paddingHorizontal: 28,
          borderRadius: 14,
          backgroundColor: colors.primary,
          shadowColor: colors.primary,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.2,
          shadowRadius: 8,
          elevation: 3,
        }}
      >
        <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 13 }}>뒤로 가기 (Pop)</Text>
      </TouchableOpacity>
    </View>
  );
}

// 2. Home Tab Feed Screen triggering detail stack push
function HomeScreen({ navigation }: any) {
  const { colors } = useTheme();

  return (
    <View style={styles.screen}>
      <Text style={{ fontSize: 18, fontWeight: '800', color: colors.textNearBlack, marginBottom: 8 }}>
        홈 피드 화면
      </Text>
      <Text style={{ fontSize: 12, color: colors.textGray, marginBottom: 16 }}>
        개인화 맞춤 영양 정보 추천 목록
      </Text>

      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() => navigation.navigate('ProductDetail', { productId: 'choco-premium-dog-food' })}
        style={[styles.demoCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
      >
        <Text style={{ fontWeight: '800', color: colors.textNearBlack, fontSize: 14 }}>
          🍖 초코의 눈물 자국 개선 민트 생육 사료
        </Text>
        <Text style={{ fontSize: 11, color: colors.primary, marginTop: 6, fontWeight: '700' }}>
          수의사 등급: A+ • 정밀 분석 클릭 (Slide Push 이동)
        </Text>
      </TouchableOpacity>
    </View>
  );
}

// 3. Search Tab list Screen triggering detail stack push
function SearchScreen({ navigation }: any) {
  const { colors } = useTheme();

  return (
    <View style={styles.screen}>
      <Text style={{ fontSize: 18, fontWeight: '800', color: colors.textNearBlack, marginBottom: 8 }}>
        사료 성분 검색 화면
      </Text>
      <Text style={{ fontSize: 12, color: colors.textGray, marginBottom: 16 }}>
        의심 원재료 필터링 및 오타 교정 퍼지 검색
      </Text>

      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() => navigation.navigate('ProductDetail', { productId: 'cat-grainfree-salmon' })}
        style={[styles.demoCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
      >
        <Text style={{ fontWeight: '800', color: colors.textNearBlack, fontSize: 14 }}>
          🐟 냥이 전용 그레인프리 허브 연어 사료
        </Text>
        <Text style={{ fontSize: 11, color: colors.primary, marginTop: 6, fontWeight: '700' }}>
          탄수화물(NFE) 22% • 성분 분석 클릭 (Slide Push 이동)
        </Text>
      </TouchableOpacity>
    </View>
  );
}

// Other static Tab screens
function ScannerScreen() { return <View style={styles.screen}><Text>Scanner Screen</Text></View>; }
function CommunityScreen() { return <View style={styles.screen}><Text>Community Screen</Text></View>; }
function MyPetScreen() { return <View style={styles.screen}><Text>MyPet Screen</Text></View>; }

// -------------------------------------------------------------
// Nested Navigators definition
// -------------------------------------------------------------

const HomeStack = createNativeStackNavigator();
function HomeStackNavigator() {
  return (
    <HomeStack.Navigator screenOptions={{ headerShown: false }}>
      <HomeStack.Screen name="HomeFeed" component={HomeScreen} />
      <HomeStack.Screen name="ProductDetail" component={ProductDetailScreen} />
    </HomeStack.Navigator>
  );
}

const SearchStack = createNativeStackNavigator();
function SearchStackNavigator() {
  return (
    <SearchStack.Navigator screenOptions={{ headerShown: false }}>
      <SearchStack.Screen name="SearchList" component={SearchScreen} />
      <SearchStack.Screen name="ProductDetail" component={ProductDetailScreen} />
    </SearchStack.Navigator>
  );
}

// -------------------------------------------------------------
// BottomTabNavigator & Custom FAB Button
// -------------------------------------------------------------

// Lucide-like lightweight Vector Icon components for mobile
const TabIcon = ({ name, color, size = 22 }: { name: string; color: string; size?: number }) => {
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      {name === 'home' && <Text style={{ color, fontSize: 16, fontWeight: 'bold' }}>🏠</Text>}
      {name === 'search' && <Text style={{ color, fontSize: 16, fontWeight: 'bold' }}>🔍</Text>}
      {name === 'scan' && <Text style={{ color: '#FFFFFF', fontSize: 18, fontWeight: 'bold' }}>📷</Text>}
      {name === 'community' && <Text style={{ color, fontSize: 16, fontWeight: 'bold' }}>💬</Text>}
      {name === 'profile' && <Text style={{ color, fontSize: 16, fontWeight: 'bold' }}>🐶</Text>}
    </View>
  );
};

interface CustomTabBarButtonProps {
  children: React.ReactNode;
  onPress?: (e: GestureResponderEvent) => void;
}

function ScannerTabBarButton({ children, onPress }: CustomTabBarButtonProps) {
  const { colors } = useTheme();
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.9,
      useNativeDriver: true,
      speed: 20,
      bounciness: 4,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1.0,
      useNativeDriver: true,
      speed: 15,
      bounciness: 6,
    }).start();
  };

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={styles.fabContainer}
    >
      <Animated.View style={[{ transform: [{ scale: scaleAnim }] }]}>
        <View
          style={[
            styles.fabButton,
            {
              backgroundColor: colors.primary,
              borderColor: colors.background,
              shadowColor: colors.primary,
            },
          ]}
        >
          <TabIcon name="scan" color="#FFFFFF" size={24} />
        </View>
      </Animated.View>
    </TouchableOpacity>
  );
}

const Tab = createBottomTabNavigator();

export default function BottomTabNavigator() {
  const { colors } = useTheme();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: true,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textGray,
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '700',
          marginTop: -4,
          marginBottom: Platform.OS === 'ios' ? 0 : 6,
        },
        tabBarStyle: [
          styles.tabBar,
          {
            backgroundColor: 'rgba(255, 255, 255, 0.96)',
            borderColor: colors.border,
            shadowColor: colors.textNearBlack,
          },
        ],
      }}
    >
      <Tab.Screen
        name="홈"
        component={HomeStackNavigator}
        options={{
          tabBarIcon: ({ color }) => <TabIcon name="home" color={color} />,
        }}
      />
      <Tab.Screen
        name="검색"
        component={SearchStackNavigator}
        options={{
          tabBarIcon: ({ color }) => <TabIcon name="search" color={color} />,
        }}
      />
      <Tab.Screen
        name="스캐너"
        component={ScannerScreen}
        options={{
          tabBarLabel: '스캐너',
          tabBarLabelStyle: {
            fontSize: 10,
            fontWeight: '800',
            color: colors.primary,
            marginTop: -8,
            marginBottom: Platform.OS === 'ios' ? 0 : 6,
          },
          tabBarButton: (props) => <ScannerTabBarButton {...props} />,
        }}
      />
      <Tab.Screen
        name="커뮤니티"
        component={CommunityScreen}
        options={{
          tabBarIcon: ({ color }) => <TabIcon name="community" color={color} />,
        }}
      />
      <Tab.Screen
        name="마이펫"
        component={MyPetScreen}
        options={{
          tabBarIcon: ({ color }) => <TabIcon name="profile" color={color} />,
        }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
  },
  demoCard: {
    width: '100%',
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    shadowColor: 'rgba(0,0,0,0.03)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 1,
    marginTop: 10,
  },
  tabBar: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 24 : 12,
    left: 16,
    right: 16,
    height: 72,
    borderRadius: 36,
    borderWidth: 1,
    ...Platform.select({
      ios: {
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.08,
        shadowRadius: 24,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  fabContainer: {
    top: -24,
    justifyContent: 'center',
    alignItems: 'center',
    width: 72,
    height: 72,
    zIndex: 99,
  },
  fabButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 4,
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.35,
        shadowRadius: 10,
      },
      android: {
        elevation: 8,
      },
    }),
  },
});
