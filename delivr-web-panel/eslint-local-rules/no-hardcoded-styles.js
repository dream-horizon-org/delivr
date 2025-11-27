module.exports = {
  meta: {
    type: "problem",
    docs: {
      description: "Disallow hardcoded hex colors, px values, and other style literals - use theme instead",
      category: "Best Practices",
      recommended: true,
    },
    messages: {
      noHardcodedColor: "Hardcoded color '{{value}}' detected. Use theme.other.brand, theme.other.text, or theme.other.backgrounds instead.",
      noHardcodedSize: "Hardcoded size value '{{value}}' detected. Use theme.other.spacing, theme.other.sizes, or theme.other.borderRadius instead.",
      noHardcodedShadow: "Hardcoded shadow '{{value}}' detected. Use theme.other.shadows instead.",
      noHardcodedTransition: "Hardcoded transition '{{value}}' detected. Use theme.other.transitions instead.",
      noHardcodedOpacity: "Hardcoded opacity '{{value}}' detected. Use theme.other.opacity instead.",
      noHardcodedFontWeight: "Hardcoded font weight '{{value}}' detected. Use theme.other.typography.fontWeight instead.",
    },
    fixable: null,
    schema: [],
  },

  create(context) {
    const hexColorRegex = /#(?:[0-9a-fA-F]{3}){1,2}(?![0-9a-fA-F])/;
    const rgbaColorRegex = /rgba?\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*(?:,\s*[\d.]+\s*)?\)/;
    const pxValueRegex = /^\d+px$/;
    const remValueRegex = /^\d+(?:\.\d+)?rem$/;
    const shadowRegex = /^\d+px\s+\d+px\s+\d+px/;
    const transitionRegex = /^all\s+\d+m?s\s+ease/;
    const opacityRegex = /^0\.\d+$/;
    
    const allowedFiles = [
      /theme\/.*\.(ts|tsx|js|jsx)$/,
      /\.test\.(ts|tsx|js|jsx)$/,
      /__tests__\//,
    ];

    const isAllowedFile = (filename) => {
      return allowedFiles.some(pattern => pattern.test(filename));
    };

    const checkStringLiteral = (node) => {
      const filename = context.getFilename();
      if (isAllowedFile(filename)) {
        return;
      }

      const value = node.value;
      
      if (typeof value !== 'string') {
        return;
      }

      if (hexColorRegex.test(value) && value !== '#fff' && value !== '#000') {
        context.report({
          node,
          messageId: "noHardcodedColor",
          data: { value },
        });
      }

      if (rgbaColorRegex.test(value)) {
        context.report({
          node,
          messageId: "noHardcodedColor",
          data: { value },
        });
      }

      if (pxValueRegex.test(value) && !value.match(/^[01]px$/)) {
        context.report({
          node,
          messageId: "noHardcodedSize",
          data: { value },
        });
      }

      if (shadowRegex.test(value)) {
        context.report({
          node,
          messageId: "noHardcodedShadow",
          data: { value },
        });
      }

      if (transitionRegex.test(value)) {
        context.report({
          node,
          messageId: "noHardcodedTransition",
          data: { value },
        });
      }

      if (opacityRegex.test(value) && parseFloat(value) !== 0.0 && parseFloat(value) !== 1.0) {
        context.report({
          node,
          messageId: "noHardcodedOpacity",
          data: { value },
        });
      }
    };

    const checkNumericProperty = (node) => {
      const filename = context.getFilename();
      if (isAllowedFile(filename)) {
        return;
      }

      if (node.key && node.value && node.value.type === 'Literal') {
        const keyName = node.key.name || node.key.value;
        const value = node.value.value;

        const styleProps = [
          'fontWeight',
          'fontSize',
          'lineHeight',
          'letterSpacing',
          'padding',
          'margin',
          'width',
          'height',
          'borderRadius',
          'top',
          'right',
          'bottom',
          'left',
          'gap',
        ];

        if (styleProps.includes(keyName)) {
          if (typeof value === 'number' && value > 2) {
            context.report({
              node: node.value,
              messageId: "noHardcodedSize",
              data: { value: value.toString() },
            });
          }

          if (keyName === 'fontWeight' && typeof value === 'number') {
            context.report({
              node: node.value,
              messageId: "noHardcodedFontWeight",
              data: { value: value.toString() },
            });
          }
        }
      }
    };

    return {
      Literal(node) {
        checkStringLiteral(node);
      },
      Property(node) {
        checkNumericProperty(node);
      },
    };
  },
};

