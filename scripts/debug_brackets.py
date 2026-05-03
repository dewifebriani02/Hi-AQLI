import sys

def check_balance(filename):
    with open(filename, 'r') as f:
        content = f.read()
    
    stack = []
    quotes = {'"': False, "'": False, '`': False}
    in_comment = False
    in_multiline_comment = False

    for i, char in enumerate(content):
        # Handle comments
        if in_comment:
            if char == '\n':
                in_comment = False
            continue
        if in_multiline_comment:
            if content[i:i+2] == '*/':
                in_multiline_comment = False
                # Skip the next char too
            continue
        
        # Check for start of comments
        if content[i:i+2] == '//':
            in_comment = True
            continue
        if content[i:i+2] == '/*':
            in_multiline_comment = True
            continue

        # Handle strings
        if char in quotes:
            # Check if escaped
            if i > 0 and content[i-1] == '\\':
                continue
            
            # If we are in another type of quote, ignore
            other_active = any(v for k, v in quotes.items() if k != char and v)
            if other_active:
                continue
            
            quotes[char] = not quotes[char]
            continue
        
        if any(quotes.values()):
            continue
            
        # Handle brackets
        if char == '{':
            stack.append(('{', i))
        elif char == '}':
            if not stack or stack[-1][0] != '{':
                print(f"Error: unmatched }} at position {i}")
                return
            stack.pop()
        elif char == '(':
            stack.append(('(', i))
        elif char == ')':
            if not stack or stack[-1][0] != '(':
                print(f"Error: unmatched ) at position {i}")
                return
            stack.pop()
        elif char == '[':
            stack.append(('[', i))
        elif char == ']':
            if not stack or stack[-1][0] != '[':
                print(f"Error: unmatched ] at position {i}")
                return
            stack.pop()

    if stack:
        for s, pos in stack:
            # Find line number
            line_num = content[:pos].count('\n') + 1
            print(f"Error: unclosed {s} starting at line {line_num}")
    else:
        print("Balanced!")

if __name__ == "__main__":
    check_balance(sys.argv[1])
