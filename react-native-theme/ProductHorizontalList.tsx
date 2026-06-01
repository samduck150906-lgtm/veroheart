import React, { useCallback } from 'react';
import {
  FlatList,
  View,
  Image,
  StyleSheet,
  TouchableOpacity,
  ListRenderItem,
} from 'react-native';
import { useTheme } from './ThemeProvider';
import { Text } from './Text';

// =============================================================
// 1. Types & Design Tokens
// =============================================================

export interface MobileProduct {
  id: string;
  brand: string;
  name: string;
  imageUrl: string;
  /** A~F Nutritional Rating Grade */
  grade: 'A' | 'B' | 'C' | 'D' | 'E' | 'F';
  price?: number;
  averageRating?: number;
}

export interface ProductHorizontalListProps {
  products: MobileProduct[];
  onProductPress?: (id: string) => void;
  title?: string;
  subtitle?: string;
}

// Fixed dimensions for FlatList optimization (getItemLayout)
const CARD_WIDTH = 154;
const CARD_MARGIN = 12;
const ITEM_SIZE = CARD_WIDTH + CARD_MARGIN;

// =============================================================
// 2. High-Performance Product Recommendation Card
// =============================================================

interface ProductCardProps {
  product: MobileProduct;
  onPress?: (id: string) => void;
}

/**
 * React.memo prevents redundant card re-renders when the parent list scrolls.
 */
const ProductCard = React.memo<ProductCardProps>(({ product, onPress }) => {
  const theme = useTheme();

  // Color mapping based on Hhwahae / ToxiPets-inspired grades
  const getGradeDesign = (grade: 'A' | 'B' | 'C' | 'D' | 'E' | 'F') => {
    switch (grade) {
      case 'A':
      case 'B':
        return {
          bg: 'rgba(129, 201, 149, 0.1)',
          text: theme.colors.primary,
          label: '우수',
        };
      case 'C':
      case 'D':
        return {
          bg: 'rgba(245, 166, 35, 0.1)',
          text: '#F5A623', // Warm Amber
          label: '보통',
        };
      case 'E':
      case 'F':
      default:
        return {
          bg: 'rgba(217, 48, 37, 0.1)',
          text: theme.colors.warning,
          label: '주의',
        };
    }
  };

  const gradeDesign = getGradeDesign(product.grade);

  return (
    <TouchableOpacity
      activeOpacity={0.88}
      onPress={() => onPress?.(product.id)}
      style={[
        styles.cardContainer,
        {
          width: CARD_WIDTH,
          marginRight: CARD_MARGIN,
          backgroundColor: theme.colors.background,
          borderColor: theme.colors.border,
        },
      ]}
    >
      {/* 1. Thumbnail Image */}
      <View style={[styles.imageWrapper, { backgroundColor: theme.colors.surface }]}>
        <Image
          source={{ uri: product.imageUrl }}
          style={styles.thumbnail}
          resizeMode="cover"
        />
        
        {/* Rating Badge Overlay */}
        <View style={[styles.badgeOverlay, { backgroundColor: gradeDesign.bg }]}>
          <Text
            variant="caption"
            fontWeight="800"
            style={{ color: gradeDesign.text, fontSize: 10, lineHeight: 12 }}
          >
            등급 {product.grade}
          </Text>
        </View>
      </View>

      {/* 2. Text Content */}
      <View style={styles.cardContent}>
        {/* Brand Name */}
        <Text
          variant="caption"
          fontWeight="700"
          color="textMuted"
          numberOfLines={1}
          style={{ marginBottom: 2 }}
        >
          {product.brand}
        </Text>

        {/* Product Name */}
        <Text
          variant="h3"
          fontWeight="800"
          color="textNearBlack"
          numberOfLines={2}
          style={styles.productName}
        >
          {product.name}
        </Text>

        {/* Price & Rating Row */}
        <View style={styles.footerRow}>
          {product.averageRating !== undefined && (
            <Text
              variant="caption"
              fontWeight="700"
              style={{ color: '#F5A623', marginRight: 4 }}
            >
              ★ {product.averageRating.toFixed(1)}
            </Text>
          )}
          
          {product.price !== undefined && (
            <Text
              variant="caption"
              fontWeight="800"
              color="textNearBlack"
              align="right"
              style={{ flex: 1 }}
            >
              {product.price.toLocaleString()}원
            </Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
});

ProductCard.displayName = 'ProductCard';

// =============================================================
// 3. FlatList Optimized Scroll Recommender
// =============================================================

export const ProductHorizontalList: React.FC<ProductHorizontalListProps> = ({
  products,
  onProductPress,
  title = '맞춤 사료 추천',
  subtitle = 'AAFCO 기준 충족 맞춤 분석 상품',
}) => {
  const theme = useTheme();

  // Stable rendering callback to prevent inline closures
  const renderItem = useCallback<ListRenderItem<MobileProduct>>(
    ({ item }) => <ProductCard product={item} onPress={onProductPress} />,
    [onProductPress]
  );

  // Stable key extractor
  const keyExtractor = useCallback((item: MobileProduct) => item.id, []);

  /**
   * PERFORMANCE OPTIMIZATION: getItemLayout
   * Pre-calculating card items size completely avoids heavy layout calculation costs on Native rendering.
   */
  const getItemLayout = useCallback(
    (_: any, index: number) => ({
      length: ITEM_SIZE,
      offset: ITEM_SIZE * index,
      index,
    }),
    []
  );

  return (
    <View style={styles.container}>
      {/* Section Header */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text variant="h2" fontWeight="800" color="textNearBlack" style={{ marginBottom: 4 }}>
            {title}
          </Text>
          <Text variant="caption" fontWeight="600" color="textGray">
            {subtitle}
          </Text>
        </View>
      </View>

      {/* FlatList Optimized Scroll Module */}
      <FlatList
        data={products}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        horizontal
        showsHorizontalScrollIndicator={false}
        
        // 1. Performance Optimizations
        getItemLayout={getItemLayout}
        initialNumToRender={5}
        maxToRenderPerBatch={5}
        windowSize={5}
        removeClippedSubviews={true} // Free up off-screen Native memory
        
        // 2. High-end Snapping physics (iOS-style snap pagination)
        snapToInterval={ITEM_SIZE}
        decelerationRate="fast"
        
        contentContainerStyle={styles.listPadding}
      />
    </View>
  );
};

// =============================================================
// 4. Stylesheet (Highly flexible cosmetic definitions)
// =============================================================

const styles = StyleSheet.create({
  container: {
    marginVertical: 16,
    width: '100%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  listPadding: {
    paddingLeft: 16,
    paddingRight: 4, // Leaves visual cues for more cards
  },
  cardContainer: {
    borderRadius: 20,
    borderWidth: 1.5,
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
  },
  imageWrapper: {
    width: '100%',
    height: 110,
    position: 'relative',
    overflow: 'hidden',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  badgeOverlay: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  cardContent: {
    padding: 10,
    flex: 1,
    justifyContent: 'space-between',
  },
  productName: {
    fontSize: 13,
    lineHeight: 17,
    height: 34, // Ensures space for up to 2 lines
    overflow: 'hidden',
    marginTop: 2,
    marginBottom: 6,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 'auto',
  },
});
