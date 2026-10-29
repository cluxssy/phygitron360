import React from 'react';

/**
 * Lightweight, zero-dependency Framer Motion shim.
 * Maps motion primitives directly to native HTML elements while safely stripping
 * animation props, ensuring high performance and zero bundle bloat in production.
 */

export const AnimatePresence = ({ children }) => <>{children}</>;

const createMotionComponent = (Tag) =>
  React.forwardRef(function MotionComponent(
    { initial, animate, exit, transition, variants, whileHover, whileTap, whileFocus, whileDrag, layout, layoutId, ...props },
    ref
  ) {
    return <Tag ref={ref} {...props} />;
  });

export const motion = {
  div: createMotionComponent('div'),
  span: createMotionComponent('span'),
  button: createMotionComponent('button'),
  p: createMotionComponent('p'),
  a: createMotionComponent('a'),
  section: createMotionComponent('section'),
  article: createMotionComponent('article'),
  ul: createMotionComponent('ul'),
  li: createMotionComponent('li'),
  h1: createMotionComponent('h1'),
  h2: createMotionComponent('h2'),
  h3: createMotionComponent('h3'),
  h4: createMotionComponent('h4'),
  header: createMotionComponent('header'),
  nav: createMotionComponent('nav'),
  main: createMotionComponent('main'),
  footer: createMotionComponent('footer'),
};

export default motion;
