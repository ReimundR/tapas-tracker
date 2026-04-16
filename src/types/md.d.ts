declare module "*.md" {
  import React from 'react'
  const component: React.ComponentType<{ components?: any }>;
  export default component;
}
/*declare module "*.md" {
  const content: string;
  export default content;
}*/