import React, { useEffect, useRef } from 'react';
import { Animated, View, StyleSheet } from 'react-native';

interface SkeletonProps {
    width?: number | string;
    height?: number;
    borderRadius?: number;
    style?: object;
}

/**
 * Skeleton loader component with shimmer animation
 */
export const Skeleton = ({
    width = '100%',
    height = 20,
    borderRadius = 4,
    style
}: SkeletonProps) => {
    const shimmerAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        const shimmer = Animated.loop(
            Animated.sequence([
                Animated.timing(shimmerAnim, {
                    toValue: 1,
                    duration: 1000,
                    useNativeDriver: true,
                }),
                Animated.timing(shimmerAnim, {
                    toValue: 0,
                    duration: 1000,
                    useNativeDriver: true,
                }),
            ])
        );
        shimmer.start();
        return () => shimmer.stop();
    }, [shimmerAnim]);

    const opacity = shimmerAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0.3, 0.7],
    });

    return (
        <Animated.View
            style={[
                {
                    width,
                    height,
                    borderRadius,
                    backgroundColor: '#2a2a4a',
                    opacity,
                },
                style,
            ]}
        />
    );
};

/**
 * PDF Card Skeleton - matches PDFCard layout
 */
export const PDFCardSkeleton = ({ cardWidth = 100 }: { cardWidth?: number }) => {
    return (
        <View style={[styles.cardContainer, { width: cardWidth }]}>
            <Skeleton width="100%" height={160} borderRadius={8} />
            <Skeleton width="90%" height={14} borderRadius={4} style={{ marginTop: 8 }} />
            <View style={styles.cardFooter}>
                <Skeleton width={40} height={10} borderRadius={4} />
                <Skeleton width={50} height={10} borderRadius={4} />
            </View>
        </View>
    );
};

/**
 * Abbreviation/Word Item Skeleton
 */
export const ListItemSkeleton = () => {
    return (
        <View style={styles.listItemContainer}>
            <Skeleton width="60%" height={18} borderRadius={4} />
            <Skeleton width="90%" height={14} borderRadius={4} style={{ marginTop: 8 }} />
        </View>
    );
};

/**
 * Grid of PDF Card Skeletons
 */
export const PDFGridSkeleton = ({ count = 6 }: { count?: number }) => {
    return (
        <View style={styles.gridContainer}>
            {Array.from({ length: count }).map((_, index) => (
                <View key={index} style={styles.gridItem}>
                    <PDFCardSkeleton cardWidth={100} />
                </View>
            ))}
        </View>
    );
};

/**
 * List of Item Skeletons
 */
export const ListSkeleton = ({ count = 5 }: { count?: number }) => {
    return (
        <View style={styles.listContainer}>
            {Array.from({ length: count }).map((_, index) => (
                <ListItemSkeleton key={index} />
            ))}
        </View>
    );
};

const styles = StyleSheet.create({
    cardContainer: {
        marginHorizontal: 4,
    },
    cardFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 4,
    },
    listItemContainer: {
        backgroundColor: '#1A1A40',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
    },
    gridContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        paddingHorizontal: 16,
    },
    gridItem: {
        marginBottom: 16,
        marginRight: 12,
    },
    listContainer: {
        paddingHorizontal: 20,
    },
});

export default Skeleton;
