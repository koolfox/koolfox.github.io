"""Exercise for the numeric convolution example on s05, pages 27-37."""
image = [[1, 1, 1, 0, 0],
         [0, 1, 1, 1, 0],
         [0, 0, 1, 1, 1],
         [0, 0, 1, 1, 0],
         [0, 1, 1, 0, 0]]
kernel = [[1, 0, 1], [0, 1, 0], [1, 0, 1]]
output = []
for row in range(3):
    output_row = []
    for col in range(3):
        value = sum(
            image[row+i][col+j] * kernel[i][j]
            for i in range(3) for j in range(3)
        )
        output_row.append(value)
    output.append(output_row)
print(output)
