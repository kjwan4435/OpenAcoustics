// file for the addition class declaration for the diagram drawing

class Circle { // used for the mode indicator
    constructor(x, y, r, color) {
      this.x = x;
      this.y = y;
      this.r = r;
      this.color = color;
    }
  
    display() {
      fill(this.color);
      noStroke();
      ellipse(this.x, this.y, this.r * 2, this.r * 2); // diameter = radius * 2
    }

    relocate(_x, _y) {
        // first, remove the circle by drawing circle with background color
        fill(color(255,255,255)); 
        noStroke();
        ellipse(this.x, this.y, this.r * 2.1, this.r * 2.1);

        // draw new ellipse 
        this.x = _x;
        this.y = _y;

        fill(this.color);
        noStroke();
        ellipse(this.x, this.y, this.r * 2, this.r * 2);
        
    }

    changeColor(_color) {
        this.color = _color;
    }
  }