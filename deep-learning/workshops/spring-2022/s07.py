patch = [[0.2,0.3,0.4], [0.3,0.9,0.5], [0.2,0.4,0.6]]
kernel = [[0,0,0], [0,1,0], [0,0,0]]
bias = 0.1
def filter_patch(image, weights, b):
    products = [image[i][j]*weights[i][j] for i in range(3) for j in range(3)]
    return sum(products)+b
average = [[1/9]*3 for _ in range(3)]
result = {"filtered": filter_patch(patch,kernel,bias),
          "smoothed": filter_patch(patch,average,0),
          "kernel_sum": sum(map(sum,kernel))}
