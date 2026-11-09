import React from 'react';

const SAMPLES = {
  'Hello World (show)': `int main() {
    int x = 10;
    int y = 20;
    int sum = x + y;
    show("Sum of x + y = ", sum);
    return 0;
}`,

  'Show Demo': `int main() {
    int a = 42;
    float pi = 3;
    char ch = 'A';

    show("The answer is: ", a);
    show("Value of pi: ", pi);
    show("Character: ", ch);
    show("Hello from StrictC!");

    return 0;
}`,

  'If-Else Statement': `int main() {
    int a = 15;
    int b = 20;
    int max;

    if (a > b) {
        max = a;
    } else {
        max = b;
    }

    return max;
}`,

  'While Loop': `int main() {
    int i = 0;
    int sum = 0;

    while (i < 10) {
        sum = sum + i;
        i = i + 1;
    }

    return sum;
}`,

  'For Loop': `int main() {
    int sum = 0;

    for (int i = 1; i <= 100; i++) {
        sum = sum + i;
    }

    return sum;
}`,

  'Repeat Loop (Extended)': `int main() {
    int count = 0;

    repeat(5) {
        count = count + 1;
    }

    return count;
}`,

  'Foreach Loop (Extended)': `int main() {
    int arr[5] = {10, 20, 30, 40, 50};
    int sum = 0;

    foreach(x in arr) {
        sum = sum + x;
    }

    return sum;
}`,

  'Range Loop (Extended)': `int main() {
    int sum = 0;

    range(i, 0, 10) {
        sum = sum + i;
    }

    return sum;
}`,

  'Functions': `int add(int a, int b) {
    return a + b;
}

int multiply(int a, int b) {
    return a * b;
}

int main() {
    int x = add(3, 4);
    int y = multiply(x, 2);
    return y;
}`,

  'Arrays': `int main() {
    int arr[5] = {1, 2, 3, 4, 5};
    int sum = 0;

    for (int i = 0; i < 5; i++) {
        sum = sum + arr[i];
    }

    return sum;
}`,

  'Constants (Strict)': `int main() {
    const int MAX = 100;
    int sum = 0;

    for (int i = 1; i <= MAX; i++) {
        sum = sum + i;
    }

    return sum;
}`,

  'Type Error Demo': `int main() {
    int x = 10;
    float y = 3.14;
    char c = 'A';

    // This will cause a type error
    x = y;

    return 0;
}`,

  'All Features Combined': `int factorial(int n) {
    if (n <= 1) {
        return 1;
    }
    return n * factorial(n - 1);
}

int main() {
    const int SIZE = 5;
    int arr[5] = {1, 2, 3, 4, 5};
    int results[5];
    int sum = 0;

    // Using range loop
    range(i, 0, SIZE) {
        results[i] = factorial(arr[i]);
        show("factorial = ", results[i]);
    }

    // Using foreach loop
    foreach(x in results) {
        sum = sum + x;
    }

    // Using repeat loop
    repeat(3) {
        sum = sum + 1;
    }

    show("Final sum: ", sum);
    return sum;
}`,
};

export default function SamplePrograms({ onSelect }) {
  return (
    <select
      className="sc-sample-select"
      onChange={e => {
        if (e.target.value && SAMPLES[e.target.value]) {
          onSelect(SAMPLES[e.target.value]);
        }
      }}
      defaultValue=""
    >
      <option value="" disabled>📝 Load Sample Program...</option>
      {Object.keys(SAMPLES).map(name => (
        <option key={name} value={name}>{name}</option>
      ))}
    </select>
  );
}
