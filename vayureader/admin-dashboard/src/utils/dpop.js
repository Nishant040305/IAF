const DPOP_PRIVATE_JWK_KEY = 'dpop_private_jwk';
const DPOP_PUBLIC_JWK_KEY = 'dpop_public_jwk';

const textEncoder = new TextEncoder();

const base64UrlEncode = (input) => {
    const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
    let binary = '';
    bytes.forEach((b) => {
        binary += String.fromCharCode(b);
    });
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
};

const base64UrlEncodeUtf8 = (value) => {
    return base64UrlEncode(textEncoder.encode(value));
};

const decodeBase64UrlToBytes = (value) => {
    const base64 = value.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
    const binary = atob(padded);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
};

const sha256Base64Url = async (value) => {
    const data = typeof value === 'string' ? textEncoder.encode(value) : value;
    const digest = await crypto.subtle.digest('SHA-256', data);
    return base64UrlEncode(new Uint8Array(digest));
};

const randomJti = () => {
    const bytes = new Uint8Array(24);
    crypto.getRandomValues(bytes);
    return base64UrlEncode(bytes);
};

const getStoredJwks = () => {
    try {
        const privateJwkRaw = localStorage.getItem(DPOP_PRIVATE_JWK_KEY);
        const publicJwkRaw = localStorage.getItem(DPOP_PUBLIC_JWK_KEY);
        if (!privateJwkRaw || !publicJwkRaw) return null;
        return {
            privateJwk: JSON.parse(privateJwkRaw),
            publicJwk: JSON.parse(publicJwkRaw)
        };
    } catch (error) {
        return null;
    }
};

const storeJwks = (privateJwk, publicJwk) => {
    localStorage.setItem(DPOP_PRIVATE_JWK_KEY, JSON.stringify(privateJwk));
    localStorage.setItem(DPOP_PUBLIC_JWK_KEY, JSON.stringify(publicJwk));
};

const importPrivateKey = async (privateJwk) => {
    return crypto.subtle.importKey(
        'jwk',
        privateJwk,
        { name: 'ECDSA', namedCurve: 'P-256' },
        false,
        ['sign']
    );
};

const getOrCreateKeyPair = async () => {
    const stored = getStoredJwks();
    if (stored?.privateJwk && stored?.publicJwk) {
        try {
            const privateKey = await importPrivateKey(stored.privateJwk);
            return {
                privateKey,
                privateJwk: stored.privateJwk,
                publicJwk: stored.publicJwk
            };
        } catch (error) {
            localStorage.removeItem(DPOP_PRIVATE_JWK_KEY);
            localStorage.removeItem(DPOP_PUBLIC_JWK_KEY);
        }
    }

    const keyPair = await crypto.subtle.generateKey(
        { name: 'ECDSA', namedCurve: 'P-256' },
        true,
        ['sign', 'verify']
    );

    const privateJwk = await crypto.subtle.exportKey('jwk', keyPair.privateKey);
    const publicJwk = await crypto.subtle.exportKey('jwk', keyPair.publicKey);
    storeJwks(privateJwk, publicJwk);

    return {
        privateKey: keyPair.privateKey,
        privateJwk,
        publicJwk
    };
};

const normalizeRequestHtu = (requestUri) => {
    const baseUrl = window.__ENV__?.REACT_APP_API_BASE_URL || process.env.REACT_APP_API_BASE_URL || window.location.origin;
    const parsed = new URL(requestUri, baseUrl);
    parsed.searchParams.delete('dpop');
    const query = parsed.searchParams.toString();
    return query ? `${parsed.pathname}?${query}` : parsed.pathname;
};

const derLength = (bytes, offset) => {
    const first = bytes[offset];
    if (first < 0x80) {
        return { length: first, bytesRead: 1 };
    }
    const size = first & 0x7f;
    let value = 0;
    for (let i = 0; i < size; i += 1) {
        value = (value << 8) | bytes[offset + 1 + i];
    }
    return { length: value, bytesRead: 1 + size };
};

const toFixedLength = (bytes, targetSize) => {
    let out = bytes;
    while (out.length > 0 && out[0] === 0x00) {
        out = out.slice(1);
    }
    if (out.length > targetSize) {
        out = out.slice(out.length - targetSize);
    }
    if (out.length < targetSize) {
        const padded = new Uint8Array(targetSize);
        padded.set(out, targetSize - out.length);
        return padded;
    }
    return out;
};

const derToJoseSignature = (derBytes) => {
    // Some runtimes may already return JOSE raw signature.
    if (derBytes.length === 64) {
        return derBytes;
    }

    if (derBytes.length < 8 || derBytes[0] !== 0x30) {
        throw new Error('Unsupported ECDSA signature format');
    }

    let offset = 1;
    const seqLenInfo = derLength(derBytes, offset);
    offset += seqLenInfo.bytesRead;

    if (derBytes[offset] !== 0x02) {
        throw new Error('Invalid ECDSA DER signature (missing R)');
    }
    offset += 1;
    const rLenInfo = derLength(derBytes, offset);
    offset += rLenInfo.bytesRead;
    const r = derBytes.slice(offset, offset + rLenInfo.length);
    offset += rLenInfo.length;

    if (derBytes[offset] !== 0x02) {
        throw new Error('Invalid ECDSA DER signature (missing S)');
    }
    offset += 1;
    const sLenInfo = derLength(derBytes, offset);
    offset += sLenInfo.bytesRead;
    const s = derBytes.slice(offset, offset + sLenInfo.length);

    const rFixed = toFixedLength(r, 32);
    const sFixed = toFixedLength(s, 32);
    const jose = new Uint8Array(64);
    jose.set(rFixed, 0);
    jose.set(sFixed, 32);
    return jose;
};

const signCompactJwt = async ({ header, payload, privateKey }) => {
    const encodedHeader = base64UrlEncodeUtf8(JSON.stringify(header));
    const encodedPayload = base64UrlEncodeUtf8(JSON.stringify(payload));
    const signingInput = `${encodedHeader}.${encodedPayload}`;

    const signatureBuffer = await crypto.subtle.sign(
        { name: 'ECDSA', hash: 'SHA-256' },
        privateKey,
        textEncoder.encode(signingInput)
    );
    const signatureBytes = derToJoseSignature(new Uint8Array(signatureBuffer));

    return `${signingInput}.${base64UrlEncode(signatureBytes)}`;
};

/**
 * Returns the public JWK used to bind login-issued tokens.
 */
export async function getDpopPublicJwk() {
    const { publicJwk } = await getOrCreateKeyPair();
    return publicJwk;
}

/**
 * Creates a per-request DPoP proof JWT.
 */
export async function createDpopProof({ method, requestUri, accessToken }) {
    if (!accessToken) {
        throw new Error('Cannot build DPoP proof without access token');
    }

    const { privateKey, publicJwk } = await getOrCreateKeyPair();
    const nowSec = Math.floor(Date.now() / 1000);

    const payload = {
        htm: String(method || 'GET').toUpperCase(),
        htu: normalizeRequestHtu(requestUri),
        iat: nowSec,
        jti: randomJti(),
        ath: await sha256Base64Url(accessToken)
    };

    const header = {
        typ: 'dpop+jwt',
        alg: 'ES256',
        jwk: publicJwk
    };

    return signCompactJwt({
        header,
        payload,
        privateKey
    });
}

export function appendDpopQueryParam(requestUri, proof) {
    const baseUrl = window.__ENV__?.REACT_APP_API_BASE_URL || process.env.REACT_APP_API_BASE_URL || window.location.origin;
    const parsed = new URL(requestUri, baseUrl);
    parsed.searchParams.set('dpop', proof);
    return parsed.toString();
}

export function clearDpopKeys() {
    localStorage.removeItem(DPOP_PRIVATE_JWK_KEY);
    localStorage.removeItem(DPOP_PUBLIC_JWK_KEY);
}

export function decodeRawJwtPayload(token) {
    if (!token || typeof token !== 'string') return null;
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    try {
        const bytes = decodeBase64UrlToBytes(parts[1]);
        return JSON.parse(new TextDecoder().decode(bytes));
    } catch {
        return null;
    }
}
