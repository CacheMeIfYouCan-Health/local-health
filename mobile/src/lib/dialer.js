import { Linking, Alert } from 'react-native';

// Provider -> USSD template. {pin} gets replaced with the voucher PIN.
export const USSD_TEMPLATES = {
  vodacom: '*136*01*{pin}#',
  mtn:     '*136*{pin}#',
  cellc:   '*102*{pin}#',
  telkom:  '*188*{pin}#',
};

export async function callNumber(phone) {
  const url = `tel:${phone.replace(/\s+/g, '')}`;
  const ok = await Linking.canOpenURL(url);
  if (!ok) return Alert.alert('Cannot open dialer', url);
  Linking.openURL(url);
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