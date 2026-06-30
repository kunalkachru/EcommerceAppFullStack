import React, { useRef, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Dimensions,
} from "react-native";
import { storePromos } from "../data/promos";

const CARD_WIDTH = Dimensions.get("window").width - 48;

const PromoCarousel = () => {
  const scrollRef = useRef(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const onScroll = (e) => {
    const x = e.nativeEvent.contentOffset.x;
    const index = Math.round(x / (CARD_WIDTH + 12));
    setActiveIndex(index);
  };

  return (
    <View style={styles.wrap}>
      <Text style={styles.heading}>Today's offers</Text>
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled={false}
        snapToInterval={CARD_WIDTH + 12}
        decelerationRate="fast"
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        onScroll={onScroll}
        scrollEventThrottle={16}
      >
        {storePromos.map((promo) => (
          <View
            key={promo.id}
            style={[styles.card, { borderLeftColor: promo.accent }]}
          >
            <View style={[styles.badge, { backgroundColor: promo.accent }]}>
              <Text style={styles.badgeText}>{promo.badge}</Text>
            </View>
            <Text style={styles.title}>{promo.title}</Text>
            <Text style={styles.subtitle}>{promo.subtitle}</Text>
          </View>
        ))}
      </ScrollView>
      <View style={styles.dots}>
        {storePromos.map((promo, i) => (
          <View
            key={promo.id}
            style={[styles.dot, i === activeIndex && styles.dotActive]}
          />
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    marginBottom: 20,
  },
  heading: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1a1a2e",
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  scrollContent: {
    paddingRight: 12,
    gap: 12,
  },
  card: {
    width: CARD_WIDTH,
    backgroundColor: "#f8f9fc",
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
  },
  badge: {
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginBottom: 8,
  },
  badgeText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1a1a2e",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: "#5c6370",
    lineHeight: 20,
  },
  dots: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
    marginTop: 10,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#d0d5dd",
  },
  dotActive: {
    backgroundColor: "#007BFF",
    width: 18,
  },
});

export default PromoCarousel;
