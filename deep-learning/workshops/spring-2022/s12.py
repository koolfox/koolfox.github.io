box_a, box_b = [0,0,2,2], [1,1,3,3]
def area(b):
    return max(0,b[2]-b[0])*max(0,b[3]-b[1])
intersection = max(0,min(box_a[2],box_b[2])-max(box_a[0],box_b[0])) * max(0,min(box_a[3],box_b[3])-max(box_a[1],box_b[1]))
union = area(box_a)+area(box_b)-intersection
mask_a, mask_b = [1,1,0,0], [1,0,1,0]
mask_intersection = sum(a and b for a,b in zip(mask_a,mask_b))
mask_union = sum(a or b for a,b in zip(mask_a,mask_b))
result = {"box_iou": intersection/union, "mask_iou": mask_intersection/mask_union,
          "intersection": intersection, "union": union}
