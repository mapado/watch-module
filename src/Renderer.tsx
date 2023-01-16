import React, { useState } from 'react';
import { Box, Text, useApp, useInput } from 'ink';
import TextInputCJS from 'ink-text-input';
import { LogLine, LOG_LEVEL } from './logging.js';
import Theme from './theme.js';
import { Tab, Tabs } from 'ink-tab';

// @ts-expect-error -- issue with ink-text-input and CommonJS definition
const TextInput = TextInputCJS.default as typeof TextInputCJS;

type Props = {
  moduleNameSet: Set<string>;
  logLines: LogLine[];
  onAddNewPath: (pathName: string) => void;
  onExit: () => void;
};

function colorFromLevel(level: LogLine['level']): Theme | undefined {
  switch (level) {
    case LOG_LEVEL.DEBUG:
      return Theme.debug;
    case LOG_LEVEL.INFO:
      return Theme.moduleName;
    case LOG_LEVEL.WARN:
      return Theme.warn;
    case LOG_LEVEL.ERROR:
      return Theme.error;
    default:
      return;
  }
}

let maxLogLevelLength: number | undefined;

const getMaxLogLevelLength = () => {
  if (!maxLogLevelLength) {
    maxLogLevelLength = Math.max(
      ...Object.values(LOG_LEVEL).map((level) => level.length)
    );
  }

  return maxLogLevelLength;
};

type LineProps = { line: LogLine; displayModuleName: boolean; padEnd: number };

function LogLine({ line, displayModuleName, padEnd }: LineProps): JSX.Element {
  return (
    <Box>
      <Box marginRight={1}>
        <Text color={Theme.date}>{line.date.toISOString()}</Text>
      </Box>
      <Box marginRight={1}>
        <Text color={colorFromLevel(line.level)}>
          {displayModuleName
            ? line.moduleName.padEnd(padEnd)
            : line.level.padEnd(padEnd)}
        </Text>
      </Box>
      <Text color={line.color}>{line.text}</Text>
    </Box>
  );
}

export default function Renderer({
  logLines,
  moduleNameSet,
  onAddNewPath,
  onExit,
}: Props): JSX.Element {
  const { exit } = useApp();
  const [inputVisible, setInputVisible] = useState(false);
  const [query, setQuery] = useState('');
  const [activeTabName, setActiveTabName] = useState<string>('watch-module');

  useInput((input, key) => {
    if (input === 'a') {
      // ask for input
      setInputVisible(true);
    }

    if (input === 'c' && key.ctrl) {
      if (inputVisible) {
        // hide input when pressing ctrl+c while input is visible
        setInputVisible(false);

        return;
      }

      // tell ink renderer to exit
      exit();

      // notify watch-module to cleanup and exit
      onExit();
    }

    if (key.return) {
      // hide input
      setInputVisible(false);

      onAddNewPath(query);
    }
  });

  const handleTabChange = (tabName: string) => {
    setActiveTabName(tabName);
  };

  const filterActiveModule = (line: LogLine) => {
    if (activeTabName === null || activeTabName === 'watch-module') {
      return true;
    }

    return line.moduleName === activeTabName;
  };

  const moduleNames = ['watch-module', ...moduleNameSet];
  const moduleNameMaxLength = Math.max(
    ...moduleNames.map((moduleName) => moduleName.length)
  );

  return (
    <Box flexDirection="column">
      {logLines.filter(filterActiveModule).map((line, index) => {
        return (
          <LogLine
            key={index}
            line={line}
            displayModuleName={activeTabName === 'watch-module'}
            padEnd={
              activeTabName === 'watch-module'
                ? moduleNameMaxLength
                : getMaxLogLevelLength()
            }
          />
        );
      })}

      <Tabs
        onChange={handleTabChange}
        colors={{
          activeTab: {
            color: Theme.moduleName,
          },
        }}
      >
        {moduleNames.map((moduleName) => (
          <Tab key={moduleName} name={moduleName}>
            {moduleName}
          </Tab>
        ))}
      </Tabs>

      <Box>
        {inputVisible ? (
          <>
            <Text>Enter path: </Text>

            <TextInput value={query} onChange={setQuery} />
          </>
        ) : (
          <Text italic>
            Press "a" to add another package to watch, "ctrl+c" to quit
          </Text>
        )}
      </Box>
    </Box>
  );
}
