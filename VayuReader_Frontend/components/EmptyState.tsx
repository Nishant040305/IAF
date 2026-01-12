import React from 'react';
import { Image, Text, View, StyleSheet } from 'react-native';
import { icons } from '@/constants/icons';

interface EmptyStateProps {
    type: 'search' | 'pdf' | 'dictionary' | 'abbreviation' | 'error';
    message?: string;
    searchQuery?: string;
}

const emptyStateConfig = {
    search: {
        icon: icons.search,
        title: 'No Results Found',
        defaultMessage: 'Try adjusting your search terms',
    },
    pdf: {
        icon: icons.logo,
        title: 'No PDFs Available',
        defaultMessage: 'PDFs will appear here once uploaded',
    },
    dictionary: {
        icon: icons.search,
        title: 'Word Not Found',
        defaultMessage: 'Try searching for a different word',
    },
    abbreviation: {
        icon: icons.search,
        title: 'No Abbreviations',
        defaultMessage: 'Abbreviations will appear here',
    },
    error: {
        icon: icons.logo,
        title: 'Something Went Wrong',
        defaultMessage: 'Please try again later',
    },
};

/**
 * Illustrated empty state component for better UX
 */
const EmptyState = ({ type, message, searchQuery }: EmptyStateProps) => {
    const config = emptyStateConfig[type];

    return (
        <View style={styles.container}>
            <View style={styles.iconContainer}>
                <Image
                    source={config.icon}
                    style={styles.icon}
                    resizeMode="contain"
                    tintColor="#4a4a6a"
                />
            </View>

            <Text style={styles.title}>{config.title}</Text>

            {searchQuery && (
                <Text style={styles.query}>"{searchQuery}"</Text>
            )}

            <Text style={styles.message}>
                {message || config.defaultMessage}
            </Text>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 40,
        paddingVertical: 60,
    },
    iconContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#1a1a3a',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 20,
    },
    icon: {
        width: 40,
        height: 40,
    },
    title: {
        fontSize: 20,
        fontWeight: '700',
        color: '#ffffff',
        marginBottom: 8,
        textAlign: 'center',
    },
    query: {
        fontSize: 16,
        color: '#5B5FEF',
        fontWeight: '600',
        marginBottom: 8,
        textAlign: 'center',
    },
    message: {
        fontSize: 14,
        color: '#8888aa',
        textAlign: 'center',
        lineHeight: 20,
    },
});

export default EmptyState;
