import { useState, useEffect, useRef } from 'react';
import {
  reactExtension,
  Banner,
  Button,
  BlockStack,
  Text,
  Spinner,
  useAppMetafields,
  useApi,
} from '@shopify/ui-extensions-react/checkout';

const POLL_INTERVAL_MS = 10000;
const INITIAL_WAIT_MS = 6000;
const MAX_ATTEMPTS = 10;
const FALLBACK_BASE = 'https://ebe3-2402-a00-401-89c4-1810-7e03-7adc-80d4.ngrok-free.app/api/shopify/intake-token';

function IntakePrompt() {
  const [state, setState] = useState('loading');
  const [token, setToken] = useState(null);
  const attemptsRef = useRef(0);
  const cancelledRef = useRef(false);

  const api = useApi();
  console.log('[RetainerPal] api:', JSON.stringify(Object.keys(api)));
  const metafields = useAppMetafields({ namespace: 'retainerpal', key: 'intake_token' });
  const metafieldValue = metafields?.[0]?.metafield?.value;

  useEffect(() => {
    if (metafieldValue === 'completed') {
      setState('completed');
    } else if (metafieldValue) {
      setToken(metafieldValue);
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

        const res = await fetch(`${FALLBACK_BASE}?order_id=${numericId}`, {
          headers: { Authorization: `Bearer ${sessionToken}` },
        });

        // ADD THIS
        console.log('[RetainerPal] Fetching:', `${FALLBACK_BASE}?order_id=${numericId}`);
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

  if (state === 'ready') {
    return (
      <Banner title="One more step to start your order" status="info">
        <BlockStack spacing="base">
          <Text>Complete your quick intake form so we can start manufacturing your retainers as fast as possible.</Text>
          <Button to={`https://ebe3-2402-a00-401-89c4-1810-7e03-7adc-80d4.ngrok-free.app/intake/${token}`} appearance="monochrome">
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
