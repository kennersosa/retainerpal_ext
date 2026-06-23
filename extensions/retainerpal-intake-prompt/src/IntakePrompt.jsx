import { useState, useEffect, useRef } from 'react';
import {
  reactExtension,
  Banner,
  Button,
  BlockStack,
  InlineStack,
  Text,
  Spinner,
  useAppMetafields,
  useApi,
  useSettings,
} from '@shopify/ui-extensions-react/checkout';

const POLL_INTERVAL_MS = 10000;
const INITIAL_WAIT_MS = 6000;
const MAX_ATTEMPTS = 10;

function IntakePrompt() {
  const [state, setState] = useState('loading');
  const [token, setToken] = useState(null);
  const [linkType, setLinkType] = useState('intake');
  const [scanInfo, setScanInfo] = useState(null);
  const attemptsRef = useRef(0);
  const cancelledRef = useRef(false);

  const { retainerpal_base_url: BASE_URL } = useSettings();
  const POLL_URL = `${BASE_URL}/api/shopify/intake-token`;
  const INTAKE_URL = `${BASE_URL}/intake/`;

  const api = useApi();
  console.log('[RetainerPal] api:', JSON.stringify(Object.keys(api)));
  const metafields = useAppMetafields({ namespace: 'retainerpal', key: 'intake_token' });
  const metafieldValue = metafields?.[0]?.metafield?.value;

  useEffect(() => {
    if (metafieldValue === 'completed') {
      setState('completed');
    } else if (metafieldValue) {
      setToken(metafieldValue);
      setLinkType('intake');   // metafield path is always standard intake
      setState('ready');
    }
  }, [metafieldValue]);

  useEffect(() => {
    if (metafieldValue) return;

    cancelledRef.current = false;
    attemptsRef.current = 0;

    const confirmation = api.orderConfirmation?.current ?? api.orderConfirmation;
    const rawId = confirmation?.id ?? confirmation?.order?.id ?? '';
    const numericId = rawId.replace('gid://shopify/Order/', '');

    console.log('[RetainerPal] confirmation:', JSON.stringify(confirmation));
    console.log('[RetainerPal] rawId:', rawId);
    console.log('[RetainerPal] numericId:', numericId);

    let timeoutId;

    async function poll() {
      if (cancelledRef.current) return;

      if (attemptsRef.current >= MAX_ATTEMPTS) {
        setState('timed_out');
        return;
      }

      attemptsRef.current += 1;

      try {
        const sessionToken = await api.sessionToken;

        if (cancelledRef.current) return;

        const res = await fetch(`${POLL_URL}?order_id=${numericId}`, {
          headers: { Authorization: `Bearer ${sessionToken}` },
        });

        // ADD THIS
        console.log('[RetainerPal] Fetching:', `${POLL_URL}?order_id=${numericId}`);
        console.log('[RetainerPal] sessionToken present:', !!sessionToken);
        if (cancelledRef.current) return;

        if (!res.ok) {
          setState('timed_out');
          return;
        }

        const data = await res.json();

        if (cancelledRef.current) return;

        if (data.status === 'ready') {
          setToken(data.token);
          setLinkType(data.link_type ?? 'intake');
          setScanInfo(data.scan_info ?? null);
          setState('ready');
        } else if (data.status === 'completed') {
          setState('completed');
        } else if (data.status === 'expired') {
          setState('timed_out');
        } else {
          timeoutId = setTimeout(poll, POLL_INTERVAL_MS);
        }
      } catch (err) {
        console.error('[RetainerPal] Polling error:', err);
        if (!cancelledRef.current) {
          timeoutId = setTimeout(poll, POLL_INTERVAL_MS);
        }
      }
    }

    timeoutId = setTimeout(poll, INITIAL_WAIT_MS);

    return () => {
      cancelledRef.current = true;
      clearTimeout(timeoutId);
    };
  }, [metafieldValue]);

  if (state === 'completed') return null;

  // Reorder confirmation — fires BEFORE standard intake render
  if (state === 'ready' && linkType === 'reorder-confirmation') {
    return (
      <Banner title="Good news — we have your scan on file" status="success">
        <BlockStack spacing="base">

          {scanInfo && (
            <Text>
              {scanInfo.scan_type === 'upper'       ? 'Upper arch'          :
               scanInfo.scan_type === 'lower'       ? 'Lower arch'          :
               scanInfo.scan_type === 'both'        ? 'Upper and lower arches' :
               scanInfo.scan_type}
              {' '}&middot;{' '}{scanInfo.scan_date}
              {' '}&middot;{' '}{scanInfo.scan_source}
            </Text>
          )}

          <Text>
            If your teeth have not changed since this scan was taken, we
            can start making your retainer right now — no forms needed.
          </Text>

          <InlineStack spacing="base">
            <Button
              to={`${INTAKE_URL}${token}`}
              appearance="monochrome"
            >
              My teeth are the same — start my retainer
            </Button>
            <Button
              to={`${INTAKE_URL}${token}?declined=1`}
              appearance="monochrome"
              kind="secondary"
            >
              My teeth have changed
            </Button>
          </InlineStack>

        </BlockStack>
      </Banner>
    );
  }

  if (state === 'ready') {
    return (
      <Banner title="One more step to start your order" status="info">
        <BlockStack spacing="base">
          <Text>Complete your quick intake form so we can start manufacturing your retainers as fast as possible.</Text>
          <Button to={`${INTAKE_URL}${token}`} appearance="monochrome">
            Complete My Intake Form
          </Button>
        </BlockStack>
      </Banner>
    );
  }

  if (state === 'timed_out') {
    return (
      <BlockStack spacing="base">
        <Text appearance="subdued">Your intake link will appear here shortly. Please refresh this page in a few moments.</Text>
      </BlockStack>
    );
  }

  return (
    <BlockStack spacing="base">
      <Spinner size="small" />
      <Text appearance="subdued">Your intake link is being prepared, please wait a moment.</Text>
    </BlockStack>
  );
}

export default reactExtension('purchase.thank-you.block.render', () => <IntakePrompt />);
