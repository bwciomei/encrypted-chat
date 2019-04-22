import _ from 'lodash';

const PRIVATE_KEY_KEY = 'chat-key';

export const getPrivateKey = () => {
    const rawKey = localStorage.getItem(PRIVATE_KEY_KEY);
    if (_.isNil(rawKey)) {
        return null;
    }

    return JSON.parse(rawKey);
}

export const setPrivateKey = (uuid, pemString) => {
    localStorage.setItem(PRIVATE_KEY_KEY, JSON.stringify({
        uuid,
        pemString
    }))
}

export const generateKeys = () => {
    return crypto.subtle.generateKey(
        {
          name: "RSA-OAEP",
          modulusLength: 4096,
          publicExponent: new Uint8Array([0x01, 0x00, 0x01]),
          hash: "SHA-512"
          },
          true,
          ["encrypt", "decrypt"]
        );
}

export const exportPrivateKey = (key) => {
    return window.crypto.subtle.exportKey(
        "pkcs8",
        key
    )
}

export const exportPublicKey = (key) => {
    return window.crypto.subtle.exportKey(
        "spki",
        key
    )
}

/**
 * 
 * @param {ArrayBuffer} buf Convert arraybuffer to a char array 
 */
export const ab2str = (buf) => {
    return String.fromCharCode.apply(null, new Uint8Array(buf));
  }

export const str2ab = (str) => {
    const buf = new ArrayBuffer(str.length);
    const bufView = new Uint8Array(buf);
    for (let i = 0, strLen = str.length; i < strLen; i++) {
      bufView[i] = str.charCodeAt(i);
    }
    return buf;
  }
  
export const stringifyPrivateKey = (exported) => {
    const exportedAsString = ab2str(exported);
    const exportedAsBase64 = window.btoa(exportedAsString);
    const pemExported = `-----BEGIN PRIVATE KEY-----\n${exportedAsBase64}\n-----END PRIVATE KEY-----`;
  
    return pemExported;
}

export const stringifyPublicKey = (exported) => {
    const exportedAsString = ab2str(exported);
    const exportedAsBase64 = window.btoa(exportedAsString);
    const pemExported = `-----BEGIN PUBLIC KEY-----\n${exportedAsBase64}\n-----END PUBLIC KEY-----`;
  
    return pemExported;
}

export const importPrivateKey = (pem) => {
    // fetch the part of the PEM string between header and footer
    const pemHeader = "-----BEGIN PRIVATE KEY-----";
    const pemFooter = "-----END PRIVATE KEY-----";
    const pemContents = pem.substring(pemHeader.length, pem.length - pemFooter.length);
    // base64 decode the string to get the binary data
    const binaryDerString = window.atob(pemContents);
    // convert from a binary string to an ArrayBuffer
    const binaryDer = str2ab(binaryDerString);
  
    return window.crypto.subtle.importKey(
      "pkcs8",
      binaryDer,
      {
        name: "RSA-OAEP",
        hash: "SHA-512",
      },
      true,
      ["decrypt"]
    );
  }

  export const importPublicKey = (pem) => {
    // fetch the part of the PEM string between header and footer
    const pemHeader = "-----BEGIN PUBLIC KEY-----";
    const pemFooter = "-----END PUBLIC KEY-----";
    const pemContents = pem.substring(pemHeader.length, pem.length - pemFooter.length);
    // base64 decode the string to get the binary data
    const binaryDerString = window.atob(pemContents);
    // convert from a binary string to an ArrayBuffer
    const binaryDer = str2ab(binaryDerString);
  
    return window.crypto.subtle.importKey(
      "spki",
      binaryDer,
      {
        name: "RSA-OAEP",
        hash: "SHA-512",
      },
      true,
      ["encrypt"]
    );
  }