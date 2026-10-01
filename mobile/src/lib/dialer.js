import { Linking, Alert } from 'react-native';

// Provider -> USSD template. {pin} gets replaced with the voucher PIN.
export const USSD_TEMPLATES = {
  vodacom: '*136*01*{pin}#',
  mtn:     '*136*{pin}#',
  cellc:   '*102*{pin}#',
  telkom:  '*188*{pin}#',
};

/** Keep only characters a dialer understands. */
export function cleanNumber(phone) {
  return String(phone ?? '').replace(/[^\d+*#]/g, '');
}

/**
 * Opens the phone dialer pre-filled with the number; the user still has to
 * confirm the call. We open the URL directly instead of calling canOpenURL
 * first, because on iOS canOpenURL needs the scheme whitelisted and can
 * report false negatives.
 */
export async function callNumber(phone) {
  const number = cleanNumber(phone);
  if (!number) return Alert.alert('No number', 'This facility has no phone number saved.');
  try {
    await Linking.openURL(`tel:${number}`);
  } catch {
    Alert.alert('Cannot open the dialer', `Please dial ${phone} manually.`);
  }
}

export function buildUssd(provider, pin) {
  const key = provider?.toLowerCase().replace(/\s+/g, '');
  const tpl = USSD_TEMPLATES[key];
  return tpl ? tpl.replace('{pin}', pin) : null;
}

export async function loadAirtime(provider, pin, phone) {
  const ussd = buildUssd(provider, pin);
  if (!ussd) return Alert.alert('Unsupported provider', provider);

  // Android: tel: with encoded USSD opens the dialer pre-filled.
  // iOS: USSD not supported -> show the code so user can dial manually.
  const url = `tel:${encodeURIComponent(ussd)}`;
  const can = await Linking.canOpenURL(url);
  if (can) {
    Linking.openURL(url);
  } else {
    Alert.alert(
      'Dial this code',
      `${ussd}\n\nVoucher PIN: ${pin}\nProvider: ${provider}`,
      [{ text: 'OK' }]
    );
  }
}