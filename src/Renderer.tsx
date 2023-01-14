import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import TextInputCJS from 'ink-text-input';
import { isInfo, LogLine } from './logging.js';
import Theme from './theme.js';

// @ts-expect-error
const TextInput = TextInputCJS.default as typeof TextInputCJS;

type Props = {
  logLines: LogLine[];
};

function colorFromLevel(level: LogLine['level']): Theme | undefined {
  switch (level) {
    case 'debug':
      return Theme.debug;
    case 'info':
      return Theme.moduleName;
    case 'warn':
      return Theme.warn;
    case 'error':
      return Theme.error;
    default:
      return;
  }
}

function LogLine({ line }: { line: LogLine }): JSX.Element {
  return (
    <Box>
      <Box marginRight={1}>
        <Text color={Theme.date}>{line.date.toISOString()}</Text>
      </Box>
      <Box marginRight={1}>
        <Text color={colorFromLevel(line.level)}>{line.moduleName}</Text>
      </Box>
      <Text color={line.color}>{line.text}</Text>
    </Box>
  );
}

export default function Renderer({ logLines }: Props): JSX.Element {
  const [inputVisible, setInputVisible] = useState(false);
  const [query, setQuery] = useState('');

  useInput((input, key) => {
    if (input === 'a') {
      // ask for input
      setInputVisible(true);
    }

    if (key.return) {
      // hide input
      setInputVisible(false);
      console.log(query);
    }
  });

  return (
    <Box flexDirection="column">
      {logLines.map((line, index) => {
        return <LogLine key={index} line={line} />;
      })}

      <Box>
        {inputVisible ? (
          <>
            <Box marginRight={1}>
              <Text>Enter your query:</Text>
            </Box>

            <TextInput value={query} onChange={setQuery} />
          </>
        ) : (
          <Text italic>Press "a" to add another package to watch</Text>
        )}
      </Box>
    </Box>
  );
}
