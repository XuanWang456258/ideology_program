import matplotlib.pyplot as plt
from mpl_toolkits.mplot3d import Axes3D
from mpl_toolkits.mplot3d.art3d import Poly3DCollection
import numpy as np
import json
from matplotlib.colors import LinearSegmentedColormap

# 设置中文字体
plt.rcParams['font.sans-serif'] = ['SimHei', 'Arial Unicode MS', 'DejaVu Sans']
plt.rcParams['axes.unicode_minus'] = False

# 加载意识形态分类数据
def load_ideology_categories(json_file='ideology_categories.json'):
    """从JSON文件加载意识形态分类数据"""
    with open(json_file, 'r', encoding='utf-8') as f:
        return json.load(f)

# 获取所有类别的中心点（用于可视化）
def get_category_centers(categories):
    """获取每个类别的中心点坐标"""
    centers = {}
    for name, category in categories.items():
        ranges = category["ranges"]
        center = {
            "economic": (ranges["economic"][0] + ranges["economic"][1]) / 2,
            "culture": (ranges["culture"][0] + ranges["culture"][1]) / 2,
            "authority": (ranges["authority"][0] + ranges["authority"][1]) / 2
        }
        centers[name] = center
    return centers

# 检查点是否在某个类别范围内
def is_point_in_category(economic_score, culture_score, authority_score, category):
    """检查给定的分数是否在指定类别的范围内"""
    ranges = category["ranges"]
    
    economic_in_range = ranges["economic"][0] <= economic_score <= ranges["economic"][1]
    culture_in_range = ranges["culture"][0] <= culture_score <= ranges["culture"][1]
    authority_in_range = ranges["authority"][0] <= authority_score <= ranges["authority"][1]
    
    return economic_in_range and culture_in_range and authority_in_range

# 获取点所属的意识形态类别
def get_ideology_category(economic_score, culture_score, authority_score, categories):
    """根据三个维度的分数确定意识形态类别"""
    for name, category in categories.items():
        if is_point_in_category(economic_score, culture_score, authority_score, category):
            return name, category
    return None, None

class IdeologyVisualizer:
    def __init__(self, json_file='ideology_categories.json'):
        self.categories = load_ideology_categories(json_file)
        self.category_centers = get_category_centers(self.categories)
        
        # 定义颜色映射：从左翼（红色）到右翼（蓝色）
        colors = ['red', 'orange', 'yellow', 'lightgreen', 'lightblue', 'blue', 'purple']
        self.ideology_cmap = LinearSegmentedColormap.from_list('ideology_spectrum', colors, N=len(self.categories))
        
    def create_3d_visualization(self):
        """创建3D意识形态分类可视化"""
        fig = plt.figure(figsize=(16, 12))
        ax = fig.add_subplot(111, projection='3d')
        
        # 设置坐标轴标签
        ax.set_xlabel('经济轴 (左-右)', fontsize=12)
        ax.set_ylabel('文化轴 (左-右)', fontsize=12)
        ax.set_zlabel('权威轴 (下-上)', fontsize=12)
        
        # 设置坐标轴范围
        ax.set_xlim(-12, 12)
        ax.set_ylim(-12, 12)
        ax.set_zlim(-12, 12)
        
        # 添加坐标轴通过原点
        ax.plot([-12, 12], [0, 0], [0, 0], 'k--', alpha=0.3, linewidth=1)
        ax.plot([0, 0], [-12, 12], [0, 0], 'k--', alpha=0.3, linewidth=1)
        ax.plot([0, 0], [0, 0], [-12, 12], 'k--', alpha=0.3, linewidth=1)
        
        # 为每个类别分配颜色
        category_names = list(self.categories.keys())
        colors_list = [self.ideology_cmap(i/len(category_names)) for i in range(len(category_names))]
        
        # 绘制每个类别的边界框和中心点
        for i, (name, category) in enumerate(self.categories.items()):
            color = colors_list[i]
            ranges = category["ranges"]
            
            # 绘制边界框
            self._draw_category_box(ax, ranges, color, name, alpha=0.4)
            
            # 绘制中心点
            center = self.category_centers[name]
            ax.scatter(center["economic"], center["culture"], center["authority"], 
                      c=[color], s=200, alpha=0.8, edgecolors='black', linewidth=1)
            
            # 添加标签
            ax.text(center["economic"], center["culture"], center["authority"] + 0.5, 
                   name, fontsize=8, ha='center', va='bottom')
        
        # 设置视角
        ax.view_init(elev=20, azim=45)
        
        # 添加标题
        plt.suptitle('意识形态分类3D模型', fontsize=16, y=0.95)
        
        plt.tight_layout()
        plt.show()
    
    def _draw_category_box(self, ax, ranges, color, name, alpha=0.4):
        """绘制类别的3D边界框"""
        eco_min, eco_max = ranges["economic"]
        cul_min, cul_max = ranges["culture"]
        auth_min, auth_max = ranges["authority"]
        
        # 定义边界框的8个顶点
        vertices = [
            [eco_min, cul_min, auth_min],
            [eco_max, cul_min, auth_min],
            [eco_max, cul_max, auth_min],
            [eco_min, cul_max, auth_min],
            [eco_min, cul_min, auth_max],
            [eco_max, cul_min, auth_max],
            [eco_max, cul_max, auth_max],
            [eco_min, cul_max, auth_max]
        ]
        
        # 定义6个面的顶点索引
        faces = [
            [0, 1, 2, 3],  # 底面
            [4, 5, 6, 7],  # 顶面
            [0, 1, 5, 4],  # 前面
            [2, 3, 7, 6],  # 后面
            [0, 3, 7, 4],  # 左面
            [1, 2, 6, 5]   # 右面
        ]
        
        # 绘制每个面（使用Poly3DCollection实现纯色填充）
        for face in faces:
            face_vertices = [vertices[i] for i in face]
            poly = Poly3DCollection([face_vertices], alpha=0.15, facecolor=color, edgecolor=color, linewidth=1)
            ax.add_collection3d(poly)
        
        # 绘制边界框的边（更明显的边框）
        edges = [
            [0, 1], [1, 2], [2, 3], [3, 0],  # 底面
            [4, 5], [5, 6], [6, 7], [7, 4],  # 顶面
            [0, 4], [1, 5], [2, 6], [3, 7]   # 垂直边
        ]
        
        for edge in edges:
            start = vertices[edge[0]]
            end = vertices[edge[1]]
            ax.plot([start[0], end[0]], [start[1], end[1]], [start[2], end[2]], 
                   color=color, alpha=min(alpha + 0.3, 1.0), linewidth=2)
    
    def create_2d_projections(self):
        """创建2D投影图"""
        fig, axes = plt.subplots(2, 2, figsize=(16, 12))
        fig.suptitle('意识形态分类2D投影', fontsize=16)
        
        # 经济-权威投影
        self._create_2d_projection(axes[0, 1], 'economic', 'authority', '经济-权威投影')
        
        # 文化-权威投影
        self._create_2d_projection(axes[1, 0], 'culture', 'authority', '文化-权威投影')

        # 经济-文化投影
        self._create_2d_projection(axes[0, 0], 'economic', 'culture', '经济-文化投影')
        
        # 类别分布统计
        self._create_category_stats(axes[1, 1])
        
        plt.tight_layout()
        plt.show()
    
    def _create_2d_projection(self, ax, axis1, axis2, title):
        """创建2D投影"""
        ax.set_xlabel(f'{axis1}轴', fontsize=10)
        ax.set_ylabel(f'{axis2}轴', fontsize=10)
        ax.set_title(title, fontsize=12)
        ax.grid(True, alpha=0.3)
        
        # 设置坐标轴范围
        ax.set_xlim(-12, 12)
        ax.set_ylim(-12, 12)
        
        # 绘制每个类别
        category_names = list(self.categories.keys())
        colors_list = [self.ideology_cmap(i/len(category_names)) for i in range(len(category_names))]
        
        for i, (name, category) in enumerate(self.categories.items()):
            color = colors_list[i]
            ranges = category["ranges"]
            
            # 绘制矩形区域
            rect = plt.Rectangle(
                (ranges[axis1][0], ranges[axis2][0]),
                ranges[axis1][1] - ranges[axis1][0],
                ranges[axis2][1] - ranges[axis2][0],
                facecolor=color, alpha=0.6, edgecolor=color, linewidth=2
            )
            ax.add_patch(rect)
            
            # 绘制中心点
            center = self.category_centers[name]
            ax.scatter(center[axis1], center[axis2], c=[color], s=100, alpha=0.8, 
                      edgecolors='black', linewidth=1)
            
            # 添加标签
            ax.text(center[axis1], center[axis2], name, fontsize=8, ha='center', va='bottom')
    
    def _create_category_stats(self, ax):
        """创建类别统计信息"""
        ax.set_title('意识形态类别统计', fontsize=12)
        ax.axis('off')
        
        # 统计信息
        total_categories = len(self.categories)
        
        # 按经济倾向分组
        left_economic = sum(1 for cat in self.categories.values() if cat["ranges"]["economic"][1] < 0)
        center_economic = sum(1 for cat in self.categories.values() 
                            if cat["ranges"]["economic"][0] >= -2 and cat["ranges"]["economic"][1] <= 2)
        right_economic = sum(1 for cat in self.categories.values() if cat["ranges"]["economic"][0] > 0)
        
        # 按文化倾向分组
        left_culture = sum(1 for cat in self.categories.values() if cat["ranges"]["culture"][1] < 0)
        center_culture = sum(1 for cat in self.categories.values() 
                           if cat["ranges"]["culture"][0] >= -2 and cat["ranges"]["culture"][1] <= 2)
        right_culture = sum(1 for cat in self.categories.values() if cat["ranges"]["culture"][0] > 0)
        
        # 按权威倾向分组
        low_authority = sum(1 for cat in self.categories.values() if cat["ranges"]["authority"][1] < 0)
        center_authority = sum(1 for cat in self.categories.values() 
                             if cat["ranges"]["authority"][0] >= -2 and cat["ranges"]["authority"][1] <= 2)
        high_authority = sum(1 for cat in self.categories.values() if cat["ranges"]["authority"][0] > 0)
        
        stats_text = f"""
        TOTAL_CATEGORIES: {total_categories}
        
        ECON:
        - left: {left_economic}
        - mid: {center_economic}
        - right: {right_economic}
        
        CULT:
        - left: {left_culture}
        - mid: {center_culture}
        - right: {right_culture}
        
        POWER:
        - freedom: {low_authority}
        - middle: {center_authority}
        - authoritarian: {high_authority}
        """
        
        ax.text(0.1, 0.9, stats_text, transform=ax.transAxes, fontsize=10, 
               verticalalignment='top', fontfamily='monospace')
    
    def show_category_details(self):
        """显示所有类别的详细信息"""
        print("意识形态分类详细信息:")
        print("=" * 80)
        
        for name, category in self.categories.items():
            print(f"\n{name} ({category['name_en']})")
            print(f"描述: {category['description']}")
            print(f"范围:")
            print(f"  经济: {category['ranges']['economic']}")
            print(f"  文化: {category['ranges']['culture']}")
            print(f"  权威: {category['ranges']['authority']}")
            print(f"  示例: {', '.join(category['examples'])}")
            print("-" * 40)

def main():
    """主函数"""
    visualizer = IdeologyVisualizer()
    
    print("意识形态分类可视化程序")
    print("=" * 50)
    
    # 显示类别详情
    visualizer.show_category_details()

    
    # 创建2D投影
    print("\n正在创建2D投影...")
    visualizer.create_2d_projections()

        
    # 创建3D可视化
    print("\n正在创建3D可视化...")
    visualizer.create_3d_visualization()

if __name__ == "__main__":
    main()

