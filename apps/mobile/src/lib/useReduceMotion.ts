import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

/** True when the system asks for reduced motion; the theme then turns animations off like church mode does. */
export function useReduceMotion(): boolean {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduce).catch(() => undefined);
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduce);
    return () => sub.remove();
  }, []);
  return reduce;
}
